"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const GameRoom_1 = require("./GameRoom");
const game_1 = require("../types/game");
class GameManager {
    constructor(io, playerManager) {
        this.rooms = new Map();
        this.io = io;
        this.playerManager = playerManager;
    }
    generateRoomId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 5; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        // Ensure uniqueness
        if (this.rooms.has(id))
            return this.generateRoomId();
        return id;
    }
    createRoom(hostId, matchDuration) {
        const roomId = this.generateRoomId();
        const room = new GameRoom_1.GameRoom(roomId, hostId, this.io, this.playerManager, matchDuration);
        this.rooms.set(roomId, room);
        return room;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    deleteRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.destroy();
            this.rooms.delete(roomId);
        }
    }
    canJoinRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { ok: false, reason: 'Room not found' };
        if (room.playerCount >= game_1.MAX_PLAYERS_PER_ROOM)
            return { ok: false, reason: 'Room is full' };
        if (room.gameState !== 'LOBBY')
            return { ok: false, reason: 'Match already in progress' };
        return { ok: true };
    }
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
}
exports.GameManager = GameManager;
//# sourceMappingURL=GameManager.js.map