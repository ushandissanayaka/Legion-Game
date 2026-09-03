"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerManager = void 0;
const game_1 = require("../types/game");
const Collision_1 = require("../game/Collision");
class PlayerManager {
    constructor() {
        this.players = new Map();
    }
    createPlayer(id, name, roomId, spawnIndex, isHost) {
        const spawnPos = game_1.SPAWN_POSITIONS[spawnIndex % game_1.SPAWN_POSITIONS.length];
        const player = {
            id,
            name: name.substring(0, 20).trim() || `Player${Math.floor(Math.random() * 9999)}`,
            roomId,
            position: { ...spawnPos },
            rotation: { yaw: 0, pitch: 0 },
            health: game_1.PLAYER_MAX_HEALTH,
            alive: true,
            kills: 0,
            deaths: 0,
            isHost,
        };
        this.players.set(id, player);
        return player;
    }
    getPlayer(id) {
        return this.players.get(id);
    }
    removePlayer(id) {
        this.players.delete(id);
    }
    updatePosition(id, position, rotation) {
        const player = this.players.get(id);
        if (!player || !player.alive)
            return false;
        if ((0, Collision_1.isPositionBlocked)(position))
            return false;
        player.position = position;
        player.rotation = rotation;
        return true;
    }
    applyDamage(targetId, damage) {
        const player = this.players.get(targetId);
        if (!player || !player.alive)
            return { newHealth: 0, died: false };
        player.health = Math.max(0, player.health - damage);
        const died = player.health <= 0;
        if (died) {
            player.alive = false;
            player.deaths += 1;
        }
        return { newHealth: player.health, died };
    }
    addKill(killerId) {
        const player = this.players.get(killerId);
        if (player)
            player.kills += 1;
    }
    respawnPlayer(id, spawnIndex) {
        const player = this.players.get(id);
        if (!player)
            return null;
        const spawnPos = game_1.SPAWN_POSITIONS[spawnIndex % game_1.SPAWN_POSITIONS.length];
        player.health = game_1.PLAYER_MAX_HEALTH;
        player.alive = true;
        player.position = { ...spawnPos };
        return player.position;
    }
    setHost(id, isHost) {
        const player = this.players.get(id);
        if (player)
            player.isHost = isHost;
    }
    getAllPlayers() {
        return Array.from(this.players.values());
    }
    getPlayersInRoom(roomId) {
        return Array.from(this.players.values()).filter(p => p.roomId === roomId);
    }
}
exports.PlayerManager = PlayerManager;
//# sourceMappingURL=PlayerManager.js.map