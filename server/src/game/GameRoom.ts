import { Server, Socket } from 'socket.io';
import {
  GameStateEnum,
  RoomState,
  PlayerState,
  MATCH_DURATION_SECONDS,
  COUNTDOWN_SECONDS,
  RESPAWN_DELAY_MS,
  SPAWN_POSITIONS,
} from '../types/game';
import { PlayerManager } from '../players/PlayerManager';

export class GameRoom {
  public id: string;
  public hostId: string;
  public gameState: GameStateEnum;
  public matchTimeRemaining: number;
  public matchDuration: number;
  public players: Map<string, PlayerState>;
  public playerManager: PlayerManager;

  private io: Server;
  private matchTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private countdownValue: number = COUNTDOWN_SECONDS;

  constructor(id: string, hostId: string, io: Server, playerManager: PlayerManager, matchDuration: number = MATCH_DURATION_SECONDS) {
    this.id = id;
    this.hostId = hostId;
    this.io = io;
    this.gameState = GameStateEnum.LOBBY;
    this.matchDuration = matchDuration;
    this.matchTimeRemaining = matchDuration;
    this.players = new Map();
    this.playerManager = playerManager;
  }

  addPlayer(player: PlayerState): void {
    this.players.set(player.id, player);
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.playerManager.removePlayer(playerId);

    // Reassign host if needed
    if (playerId === this.hostId && this.players.size > 0) {
      const newHost = this.players.values().next().value;
      if (newHost) {
        this.hostId = newHost.id;
        newHost.isHost = true;
        this.playerManager.setHost(newHost.id, true);
      }
    }
  }

  getRoomState(): RoomState {
    return {
      id: this.id,
      hostId: this.hostId,
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      matchTimeRemaining: this.matchTimeRemaining,
      matchDuration: this.matchDuration,
    };
  }

  canStart(): boolean {
    return this.gameState === GameStateEnum.LOBBY && this.players.size >= 1;
  }

  startCountdown(): void {
    if (!this.canStart()) return;
    this.gameState = GameStateEnum.COUNTDOWN;
    this.countdownValue = COUNTDOWN_SECONDS;

    // Emit immediately
    this.io.to(this.id).emit('matchStart', {
      room: this.getRoomState(),
      countdown: this.countdownValue,
    });

    this.countdownTimer = setInterval(() => {
      this.countdownValue -= 1;
      this.io.to(this.id).emit('countdownTick', { value: this.countdownValue });

      if (this.countdownValue <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.startMatch();
      }
    }, 1000);
  }

  private startMatch(): void {
    this.gameState = GameStateEnum.PLAYING;
    this.matchTimeRemaining = this.matchDuration;

    // Respawn all players at their spawn positions
    let spawnIndex = 0;
    for (const player of this.players.values()) {
      const pos = this.playerManager.respawnPlayer(player.id, spawnIndex);
      if (pos) {
        player.health = 100;
        player.alive = true;
        player.kills = 0;
        player.deaths = 0;
        player.position = pos;
      }
      spawnIndex++;
    }

    this.io.to(this.id).emit('gameStateUpdate', { room: this.getRoomState() });

    // Start 1-second match timer
    this.matchTimer = setInterval(() => {
      this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - 1);
      this.io.to(this.id).emit('matchTime', { timeRemaining: this.matchTimeRemaining });

      if (this.matchTimeRemaining <= 0) {
        this.endMatch();
      }
    }, 1000);
  }

  private endMatch(): void {
    if (this.matchTimer) clearInterval(this.matchTimer);
    this.gameState = GameStateEnum.MATCH_OVER;

    // Find winner (most kills)
    let winner: PlayerState | null = null;
    for (const player of this.players.values()) {
      if (!winner || player.kills > winner.kills) {
        winner = player;
      }
    }

    this.io.to(this.id).emit('matchEnd', {
      room: this.getRoomState(),
      winner,
    });
  }

  resetToLobby(): void {
    if (this.matchTimer) clearInterval(this.matchTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.gameState = GameStateEnum.LOBBY;
    this.matchTimeRemaining = this.matchDuration;

    // Reset all players
    let spawnIndex = 0;
    for (const player of this.players.values()) {
      const pos = this.playerManager.respawnPlayer(player.id, spawnIndex);
      if (pos) {
        player.health = 100;
        player.alive = true;
        player.kills = 0;
        player.deaths = 0;
        player.position = pos;
      }
      spawnIndex++;
    }

    this.io.to(this.id).emit('gameStateUpdate', { room: this.getRoomState() });
  }

  scheduleRespawn(playerId: string): void {
    let spawnIndex = 0;
    let i = 0;
    for (const pid of this.players.keys()) {
      if (pid === playerId) { spawnIndex = i; break; }
      i++;
    }

    setTimeout(() => {
      if (!this.players.has(playerId)) return;
      const pos = this.playerManager.respawnPlayer(playerId, spawnIndex);
      const player = this.players.get(playerId);
      if (pos && player) {
        player.health = 100;
        player.alive = true;
        player.position = pos;
        this.io.to(this.id).emit('playerRespawn', {
          playerId,
          position: pos,
          health: 100,
        });
      }
    }, RESPAWN_DELAY_MS);
  }

  destroy(): void {
    if (this.matchTimer) clearInterval(this.matchTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  get playerCount(): number {
    return this.players.size;
  }
}
