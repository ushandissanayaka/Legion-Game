import * as THREE from 'three';
import { Scene } from './Scene';
import { Camera } from './Camera';
import { GameLoop } from './GameLoop';
import { Lighting } from './Lighting';
import { GameMap, SPAWN_POSITIONS } from './Map';
import { PlayerControls, LocalPlayer } from '../player/PlayerControls';
import { RemotePlayer } from '../player/RemotePlayer';
import { BotPlayer } from '../player/BotPlayer';
import { Weapon, WEAPON_DAMAGE } from '../weapons/Weapon';
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
  private spawnIndex: number;
  private isRunning = false;

  constructor(
    container: HTMLElement,
    socket: Socket,
    audio: AudioManager,
    localPlayerId: string,
    roomId: string,
    spawnIndex: number,
    initialPlayers: PlayerState[],
    callbacks: GameCallbacks,
    botCount = 0          // number of AI bots to spawn (practice mode)
  ) {
    this.container = container;
    this.socket = socket;
    this.audio = audio;
    this.localPlayerId = localPlayerId;
    this.roomId = roomId;
    this.spawnIndex = spawnIndex;
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

    // Weapon
    this.weapon = new Weapon(this.scene.scene, this.camera, this.lighting, audio);

    // Add remote players that are already in room
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

    // Player movement
    if (this.localPlayer.alive) {
      const forward = this.camera.getForwardXZ();
      const right   = this.camera.getRightXZ();
      this.localPlayer.move(forward, right, this.controls.keys, dt, this.map.colliders);
    }

    // Reload
    if (this.controls.keys['KeyR']) {
      this.weapon.reload();
      this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);
    }

    // Scoreboard toggle
    // (handled via keystate read in App.tsx)

    // Shooting — fires on click (shootPressed latch) or held mouse button
    const wantFire = (this.controls.shooting || this.controls.shootPressed)
      && this.localPlayer.alive
      && this.controls.isPointerLocked;
    this.controls.shootPressed = false; // consume one-shot latch every frame

    if (wantFire) {
      const result = this.weapon.tryFire(this.remotePlayers, this.bots);
      if (result) {
        this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);

        if (result.hitBotIndex >= 0 && result.hitBotIndex < this.bots.length) {
          // ── Bot hit — handled entirely client-side ───────────────
          (window as any).__hudShowHit?.();
          this.audio.playHit();
          const bot = this.bots[result.hitBotIndex];
          const killed = bot.takeDamage(WEAPON_DAMAGE);
          if (killed) {
            this.localPlayer.kills += 1;
            this.callbacks.onKillsChange(this.localPlayer.kills, this.localPlayer.deaths);
            this.callbacks.onKillFeed(this.localPlayerId, 'You', bot.name);
          }
        } else {
          // ── Remote player hit (or clean miss) — send to server ──
          this.socket.emit(SOCKET_EVENTS.PLAYER_SHOOT, {
            roomId: this.roomId,
            targetId: result.targetId,
            origin:    { x: result.origin.x,    y: result.origin.y,    z: result.origin.z    },
            direction: { x: result.direction.x, y: result.direction.y, z: result.direction.z },
            timestamp: Date.now(),
          });
        }
      }
    }

    // Update weapon
    this.weapon.update(dt, this.camera.camera.position);

    // Update remote players
    for (const rp of this.remotePlayers.values()) {
      rp.update(dt);
    }

    // Update bots
    for (const bot of this.bots) {
      bot.update(dt);
    }

    // Update tab key for scoreboard
    // Pass via callback if needed — done in App.tsx via keydown listener
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
    this.socket.on(SOCKET_EVENTS.PLAYER_JOINED, ({ player, room }: { player: PlayerState; room: RoomState }) => {
      if (player.id !== this.localPlayerId && !this.remotePlayers.has(player.id)) {
        const colorIdx = this.remotePlayers.size % 4;
        const rp = new RemotePlayer(player, this.scene.scene, colorIdx);
        this.remotePlayers.set(player.id, rp);
      }
      this.callbacks.onRoomUpdate(room);
    });

    // Player left
    this.socket.on(SOCKET_EVENTS.PLAYER_LEFT, ({ playerId, room }: { playerId: string; room: RoomState }) => {
      const rp = this.remotePlayers.get(playerId);
      if (rp) {
        rp.dispose(this.scene.scene);
        this.remotePlayers.delete(playerId);
      }
      this.callbacks.onRoomUpdate(room);
    });

    // Position update from other player
    this.socket.on(SOCKET_EVENTS.PLAYER_POSITION, ({
      playerId, position, rotation
    }: {
      playerId: string;
      position: { x: number; y: number; z: number };
      rotation: { yaw: number; pitch: number };
    }) => {
      const rp = this.remotePlayers.get(playerId);
      if (rp) rp.setTargetState(position, rotation);
    });

    // Hit confirmation
    this.socket.on(SOCKET_EVENTS.PLAYER_HIT, ({
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
      } else if (shooterId === this.localPlayerId) {
        // We hit someone — show hit marker
        (window as any).__hudShowHit?.();
        this.audio.playHit();
      }
    });

    // Death event
    this.socket.on(SOCKET_EVENTS.PLAYER_DEATH, ({
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
    });

    // Respawn event
    this.socket.on(SOCKET_EVENTS.PLAYER_RESPAWN, ({
      playerId, position, health
    }: {
      playerId: string;
      position: { x: number; y: number; z: number };
      health: number;
    }) => {
      if (playerId === this.localPlayerId) {
        this.localPlayer.respawn(new THREE.Vector3(position.x, position.y, position.z));
        this.weapon.reload();
        this.callbacks.onHealthChange(health);
        this.callbacks.onAmmoChange(this.weapon.ammo, this.weapon.maxAmmo);
        this.callbacks.onAliveChange(true);
        this.audio.playRespawn();
      } else {
        const rp = this.remotePlayers.get(playerId);
        if (rp) rp.setAlive(true, position);
      }
    });

    // Room state updates (score changes etc.)
    this.socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, ({ room }: { room: RoomState }) => {
      this.callbacks.onRoomUpdate(room);
    });
  }

  /** Returns current key state for scoreboard toggle */
  get tabPressed(): boolean {
    return this.controls.keys['Tab'] || false;
  }

  destroy(): void {
    this.isRunning = false;
    this.gameLoop.stop();

    // Cleanup socket listeners
    this.socket.off(SOCKET_EVENTS.PLAYER_JOINED);
    this.socket.off(SOCKET_EVENTS.PLAYER_LEFT);
    this.socket.off(SOCKET_EVENTS.PLAYER_POSITION);
    this.socket.off(SOCKET_EVENTS.PLAYER_HIT);
    this.socket.off(SOCKET_EVENTS.PLAYER_DEATH);
    this.socket.off(SOCKET_EVENTS.PLAYER_RESPAWN);
    this.socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE);

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

    // Destroy bots
    for (const bot of this.bots) {
      bot.dispose(this.scene.scene);
    }
    this.bots = [];

    this.scene.dispose();
  }
}
