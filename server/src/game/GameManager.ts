import { Server } from 'socket.io';
import { GameRoom } from './GameRoom';
import { PlayerManager } from '../players/PlayerManager';
import { MAX_PLAYERS_PER_ROOM } from '../types/game';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerManager: PlayerManager;
  private io: Server;

  constructor(io: Server, playerManager: PlayerManager) {
    this.io = io;
    this.playerManager = playerManager;
  }

  generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    // Ensure uniqueness
    if (this.rooms.has(id)) return this.generateRoomId();
    return id;
  }

  createRoom(hostId: string, matchDuration?: number): GameRoom {
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId, hostId, this.io, this.playerManager, matchDuration);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
    }
  }

  canJoinRoom(roomId: string): { ok: boolean; reason?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: 'Room not found' };
    if (room.playerCount >= MAX_PLAYERS_PER_ROOM) return { ok: false, reason: 'Room is full' };
    if (room.gameState !== 'LOBBY') return { ok: false, reason: 'Match already in progress' };
    return { ok: true };
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}
