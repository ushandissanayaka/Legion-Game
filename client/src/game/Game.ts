import * as THREE from 'three';
import { Scene } from './Scene';
import { Camera } from './Camera';
import { GameLoop } from './GameLoop';
import { Lighting } from './Lighting';
import { GameMap, SPAWN_POSITIONS } from './Map';
import { PlayerControls, LocalPlayer } from '../player/PlayerControls';
import { RemotePlayer } from '../player/RemotePlayer';
import { BotPlayer, type BotTarget } from '../player/BotPlayer';
import { Weapon } from '../weapons/Weapon';
import type { WeaponType } from '../weapons/Weapon';
import { AudioManager } from '../audio/AudioManager';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../types/game';
import type { PlayerState, RoomState } from '../types/game';

// ============================================================
// Game — ties all engine systems together
// Called from App.tsx when match starts
// ============================================================

export interface GameCallbacks {
  onHealthChange: (hp: number) => void;
  onAmmoChange: (ammo: number, max: number) => void;
  onKillsChange: (kills: number, deaths: number) => void;
  onPointerLockChange: (locked: boolean) => void;
  onAliveChange: (alive: boolean) => void;
  onWeaponChange: (weapon: WeaponType) => void;
  onKillFeed: (killerId: string, killerName: string, victimName: string) => void;
  onRoomUpdate: (room: RoomState) => void;
}

export class Game {
  private scene: Scene;
  private camera: Camera;
  private gameLoop: GameLoop;
  private lighting: Lighting;
  private map: GameMap;
  private controls: PlayerControls;
  private localPlayer: LocalPlayer;
  private weapon: Weapon;
  private audio: AudioManager;
  private socket: Socket;
  private callbacks: GameCallbacks;

  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private bots: BotPlayer[] = [];
  private container: HTMLElement;
  private roomId: string;
  private localPlayerId: string;
  private isRunning = false;
  private localRespawnTimer = 0;

  constructor(
    container: HTMLElement,
    socket: Socket,
    audio: AudioManager,
    localPlayerId: string,
    roomId: string,
    spawnIndex: number,
    initialPlayers: PlayerState[],
    callbacks: GameCallbacks,
    botCount = 0,
    initialWeapon: WeaponType = 'assault'
  ) {
    this.container = container;
    this.container.tabIndex = -1;
    this.container.focus({ preventScroll: true });
    this.socket = socket;
    this.audio = audio;
    this.localPlayerId = localPlayerId;
    this.roomId = roomId;
    this.callbacks = callbacks;

    // Init systems
    this.scene = new Scene(container);
    this.camera = new Camera(container);
    this.lighting = new Lighting(this.scene.scene);
    this.map = new GameMap(this.scene.scene);
    this.controls = new PlayerControls();

    // Spawn local player
    const spawnPos = SPAWN_POSITIONS[spawnIndex % SPAWN_POSITIONS.length];
    this.localPlayer = new LocalPlayer(spawnPos);

    // Weapon — use the weapon selected from the main menu
    this.weapon = new Weapon(this.scene.scene, this.camera, this.lighting, audio, initialWeapon);

    // Add remote players already in room
    let colorIdx = 0;
    for (const p of initialPlayers) {
      if (p.id !== localPlayerId) {
        const rp = new RemotePlayer(p, this.scene.scene, colorIdx % 4);
        this.remotePlayers.set(p.id, rp);
        colorIdx++;
      }
    }

    // Spawn AI bots (practice mode)
    for (let i = 0; i < botCount; i++) {
      this.bots.push(new BotPlayer(i, this.scene.scene));
    }

    // Set initial camera position
    this.camera.yaw = Math.atan2(spawnPos.x, spawnPos.z);
    this.camera.updateFromPosition(this.localPlayer.position);

    // Pointer lock setup
    container.addEventListener('click', this.handleContainerClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Register socket events
    this.registerSocketEvents();

    // Start game loop
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.sendNetworkUpdate.bind(this),
      this.render.bind(this)
    );
    this.isRunning = true;
    this.gameLoop.start();

    // Notify initial weapon state
    this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);
    this.callbacks.onWeaponChange(this.weapon.currentType);
  }

  private handleContainerClick = () => {
    if (!this.controls.isPointerLocked) {
      this.controls.requestPointerLock(this.container);
    }
  };

  private onPointerLockChange = () => {
    this.callbacks.onPointerLockChange(
      document.pointerLockElement === this.container ||
      document.pointerLockElement === this.container.querySelector('canvas')
    );
  };

  private update(dt: number): void {
    if (!this.isRunning) return;

    // Mouse look
    const { dx, dy } = this.controls.consumeMouseDelta();
    if (this.controls.isPointerLocked && this.localPlayer.alive) {
      this.camera.applyMouseDelta(dx, dy);
    }

    // Update camera rotation
    this.camera.updateFromPosition(this.localPlayer.position);
    this.camera.updateZoom(this.controls.aiming, dt);

    // Player movement
    if (this.localPlayer.alive) {
      const forward = this.camera.getForwardXZ();
      const right   = this.camera.getRightXZ();
      this.localPlayer.move(forward, right, this.controls.keys, dt, this.map.colliders, this.controls.jumpPressed);
      this.controls.jumpPressed = false;
    }

    // ── Weapon switching (keys 1, 2, 3) ─────────────────────
    const wantSwitch =
      this.controls.keys['Digit1'] ? 'assault' :
      this.controls.keys['Digit2'] ? 'shotgun'  :
      this.controls.keys['Digit3'] ? 'sniper'   : null;

    if (wantSwitch && wantSwitch !== this.weapon.currentType) {
      this.weapon.switchTo(wantSwitch as WeaponType);
      this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);
      this.callbacks.onWeaponChange(this.weapon.currentType);
    }

    // ── Reload (R key) ──────────────────────────────────────
    if (this.controls.keys['KeyR'] && !this.weapon.isCurrentlyReloading) {
      this.weapon.reload();
    }

    // ── Shooting ────────────────────────────────────────────
    // Auto-fire for assault rifle (hold), single for shotgun/sniper (press)
    const isAutoFire = this.weapon.currentType === 'assault';
    const wantFire = (isAutoFire ? this.controls.shooting : this.controls.shootPressed)
      && this.localPlayer.alive
      && this.controls.isPointerLocked;
    this.controls.shootPressed = false; // consume one-shot latch

    if (wantFire) {
      const result = this.weapon.tryFire(this.remotePlayers, this.bots);
      if (result) {
        this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);

        if (result.hitBotIndex >= 0 && result.hitBotIndex < this.bots.length) {
          // Bot hit — handled client-side
          (window as any).__hudShowHit?.();
          this.audio.playHit();
          const bot = this.bots[result.hitBotIndex];
          const killed = bot.takeDamage(result.damage);
          if (killed) {
            this.localPlayer.kills += 1;
            this.callbacks.onKillsChange(this.localPlayer.kills, this.localPlayer.deaths);
            this.callbacks.onKillFeed(this.localPlayerId, 'You', bot.name);
          }
        } else if (result.targetId) {
          // Remote player hit — send to server with weapon type & damage
          this.socket.emit(SOCKET_EVENTS.PLAYER_SHOOT, {
            roomId: this.roomId,
            targetId: result.targetId,
            origin:    { x: result.origin.x,    y: result.origin.y,    z: result.origin.z },
            direction: { x: result.direction.x, y: result.direction.y, z: result.direction.z },
            weaponType: result.weaponType,
            damage: result.damage,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Update weapon view model
    this.weapon.update(dt, this.camera.camera.position);

    // Update remote players
    for (const rp of this.remotePlayers.values()) {
      rp.update(dt);
    }

    // Update bots
    for (const bot of this.bots) {
      bot.update(dt, this.map.colliders);
    }

    // Practice bots fire at the nearest living player or bot.
    if (this.bots.length > 0) {
      const localTarget: BotTarget = {
        position: this.localPlayer.position,
        alive: this.localPlayer.alive,
        takeDamage: (damage: number) => this.localPlayer.takeDamage(damage),
      };
      for (const bot of this.bots) {
        const targets: BotTarget[] = [localTarget, ...this.bots.filter(other => other !== bot)];
        const target = bot.tryShoot(targets);
        if (target) {
          this.audio.playShoot();
          const targetKilled = target.takeDamage(10);

          if (target === localTarget) {
            this.localPlayer.health = Math.max(0, this.localPlayer.health);
            this.callbacks.onHealthChange(this.localPlayer.health);
            (window as any).__hudShowDamage?.();
          }

          if (targetKilled && target === localTarget) {
            this.localRespawnTimer = 3;
            this.callbacks.onAliveChange(false);
            this.callbacks.onKillsChange(this.localPlayer.kills, this.localPlayer.deaths);
          }
        }
      }
    }

    if (!this.localPlayer.alive && this.localRespawnTimer > 0) {
      this.localRespawnTimer -= dt;
      if (this.localRespawnTimer <= 0) {
        const spawnPos = SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
        this.localPlayer.respawn(spawnPos);
        this.weapon.refillMagazine();
        this.callbacks.onHealthChange(this.localPlayer.health);
        this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);
        this.callbacks.onAliveChange(true);
        this.audio.playRespawn();
      }
    }
  }

  private sendNetworkUpdate(): void {
    if (!this.isRunning || !this.localPlayer.alive) return;

    const pos = this.localPlayer.position;
    this.socket.emit(SOCKET_EVENTS.PLAYER_MOVE, {
      roomId: this.roomId,
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { yaw: this.camera.yaw, pitch: this.camera.pitch },
    });
  }

  private render(): void {
    this.scene.render(this.camera.camera);
  }

  private registerSocketEvents(): void {
    // New player joined while in game
    this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, this.handlePlayerJoined);
    this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, this.handlePlayerLeft);
    this.socket.on(SOCKET_EVENTS.PLAYER_POSITION, this.handlePlayerPosition);
    this.socket.on(SOCKET_EVENTS.PLAYER_HIT, this.handlePlayerHit);
    this.socket.on(SOCKET_EVENTS.PLAYER_DEATH, this.handlePlayerDeath);
    this.socket.on(SOCKET_EVENTS.PLAYER_RESPAWN, this.handlePlayerRespawn);
    this.socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, this.handleGameStateUpdate);
  }

  private handlePlayerJoined = ({ player, room }: { player: PlayerState; room: RoomState }) => {
      if (player.id !== this.localPlayerId && !this.remotePlayers.has(player.id)) {
        const colorIdx = this.remotePlayers.size % 4;
        const rp = new RemotePlayer(player, this.scene.scene, colorIdx);
        this.remotePlayers.set(player.id, rp);
      }
      this.callbacks.onRoomUpdate(room);
  };

    // Player left
  private handlePlayerLeft = ({ playerId, room }: { playerId: string; room: RoomState }) => {
      const rp = this.remotePlayers.get(playerId);
      if (rp) {
        rp.dispose(this.scene.scene);
        this.remotePlayers.delete(playerId);
      }
      this.callbacks.onRoomUpdate(room);
  };

    // Position update from other player
  private handlePlayerPosition = ({
      playerId, position, rotation
    }: {
      playerId: string;
      position: { x: number; y: number; z: number };
      rotation: { yaw: number; pitch: number };
    }) => {
      const rp = this.remotePlayers.get(playerId);
      if (rp) rp.setTargetState(position, rotation);
  };

    // Hit confirmation from server
  private handlePlayerHit = ({
      targetId, newHealth, shooterId
    }: {
      targetId: string;
      shooterId: string;
      newHealth: number;
    }) => {
      if (targetId === this.localPlayerId) {
        this.localPlayer.health = newHealth;
        this.callbacks.onHealthChange(newHealth);
        this.audio.playHit();
        (window as any).__hudShowDamage?.();
      } else if (shooterId === this.localPlayerId) {
        // We hit someone — show hit marker
        (window as any).__hudShowHit?.();
        this.audio.playHit();
      }
  };

    // Death event
  private handlePlayerDeath = ({
      victimId, killerId, killerName, victimName
    }: {
      victimId: string;
      killerId: string;
      killerName: string;
      victimName: string;
    }) => {
      this.callbacks.onKillFeed(killerId, killerName, victimName);

      if (victimId === this.localPlayerId) {
        this.localPlayer.alive = false;
        this.localPlayer.deaths += 1;
        this.callbacks.onAliveChange(false);
        this.callbacks.onKillsChange(this.localPlayer.kills, this.localPlayer.deaths);
        this.audio.playDeath();
      } else {
        const rp = this.remotePlayers.get(victimId);
        if (rp) rp.setAlive(false);

        if (killerId === this.localPlayerId) {
          this.localPlayer.kills += 1;
          this.callbacks.onKillsChange(this.localPlayer.kills, this.localPlayer.deaths);
        }
      }
  };

    // Respawn event
  private handlePlayerRespawn = ({
      playerId, position, health
    }: {
      playerId: string;
      position: { x: number; y: number; z: number };
      health: number;
    }) => {
      if (playerId === this.localPlayerId) {
        this.localPlayer.respawn(new THREE.Vector3(position.x, position.y, position.z));
        this.weapon.refillMagazine();
        this.callbacks.onHealthChange(health);
        this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);
        this.callbacks.onAliveChange(true);
        this.audio.playRespawn();
      } else {
        const rp = this.remotePlayers.get(playerId);
        if (rp) rp.setAlive(true, position);
      }
  };

    // Room state updates (score changes etc.)
  private handleGameStateUpdate = ({ room }: { room: RoomState }) => {
    this.callbacks.onRoomUpdate(room);
  };

  destroy(): void {
    this.isRunning = false;
    this.gameLoop.stop();

    // Cleanup socket listeners
    this.socket.off(SOCKET_EVENTS.PLAYER_JOINED, this.handlePlayerJoined);
    this.socket.off(SOCKET_EVENTS.PLAYER_LEFT, this.handlePlayerLeft);
    this.socket.off(SOCKET_EVENTS.PLAYER_POSITION, this.handlePlayerPosition);
    this.socket.off(SOCKET_EVENTS.PLAYER_HIT, this.handlePlayerHit);
    this.socket.off(SOCKET_EVENTS.PLAYER_DEATH, this.handlePlayerDeath);
    this.socket.off(SOCKET_EVENTS.PLAYER_RESPAWN, this.handlePlayerRespawn);
    this.socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, this.handleGameStateUpdate);

    this.container.removeEventListener('click', this.handleContainerClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    this.controls.exitPointerLock();
    this.controls.dispose();
    this.weapon.dispose();
    this.map.dispose();

    for (const rp of this.remotePlayers.values()) {
      rp.dispose(this.scene.scene);
    }
    this.remotePlayers.clear();

    for (const bot of this.bots) {
      bot.dispose(this.scene.scene);
    }
    this.bots = [];

    this.scene.dispose();
  }
}
