import {
  PlayerState,
  GameStateEnum,
  SPAWN_POSITIONS,
  PLAYER_MAX_HEALTH,
  Vector3Data,
  RotationData,
} from '../types/game';
import { isPositionBlocked } from '../game/Collision';

export class PlayerManager {
  private players: Map<string, PlayerState> = new Map();

  createPlayer(id: string, name: string, roomId: string, spawnIndex: number, isHost: boolean): PlayerState {
    const spawnPos = SPAWN_POSITIONS[spawnIndex % SPAWN_POSITIONS.length];
    const player: PlayerState = {
      id,
      name: name.substring(0, 20).trim() || `Player${Math.floor(Math.random() * 9999)}`,
      roomId,
      position: { ...spawnPos },
      rotation: { yaw: 0, pitch: 0 },
      health: PLAYER_MAX_HEALTH,
      alive: true,
      kills: 0,
      deaths: 0,
      isHost,
    };
    this.players.set(id, player);
    return player;
  }

  getPlayer(id: string): PlayerState | undefined {
    return this.players.get(id);
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  updatePosition(id: string, position: Vector3Data, rotation: RotationData): boolean {
    const player = this.players.get(id);
    if (!player || !player.alive) return false;
    if (isPositionBlocked(position)) return false;
    player.position = position;
    player.rotation = rotation;
    return true;
  }

  applyDamage(targetId: string, damage: number): { newHealth: number; died: boolean } {
    const player = this.players.get(targetId);
    if (!player || !player.alive) return { newHealth: 0, died: false };

    player.health = Math.max(0, player.health - damage);
    const died = player.health <= 0;
    if (died) {
      player.alive = false;
      player.deaths += 1;
    }
    return { newHealth: player.health, died };
  }

  addKill(killerId: string): void {
    const player = this.players.get(killerId);
    if (player) player.kills += 1;
  }

  respawnPlayer(id: string, spawnIndex: number): Vector3Data | null {
    const player = this.players.get(id);
    if (!player) return null;
    const spawnPos = SPAWN_POSITIONS[spawnIndex % SPAWN_POSITIONS.length];
    player.health = PLAYER_MAX_HEALTH;
    player.alive = true;
    player.position = { ...spawnPos };
    return player.position;
  }

  setHost(id: string, isHost: boolean): void {
    const player = this.players.get(id);
    if (player) player.isHost = isHost;
  }

  getAllPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  getPlayersInRoom(roomId: string): PlayerState[] {
    return Array.from(this.players.values()).filter(p => p.roomId === roomId);
  }
}
