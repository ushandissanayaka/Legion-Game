"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const game_1 = require("../types/game");
class GameRoom {
    constructor(id, hostId, io, playerManager, matchDuration = game_1.MATCH_DURATION_SECONDS) {
        this.matchTimer = null;
        this.countdownTimer = null;
        this.countdownValue = game_1.COUNTDOWN_SECONDS;
        this.id = id;
        this.hostId = hostId;
        this.io = io;
        this.gameState = game_1.GameStateEnum.LOBBY;
        this.matchDuration = matchDuration;
        this.matchTimeRemaining = matchDuration;
        this.players = new Map();
        this.playerManager = playerManager;
    }
    addPlayer(player) {
        this.players.set(player.id, player);
    }
    removePlayer(playerId) {
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
    getRoomState() {
        return {
            id: this.id,
            hostId: this.hostId,
            players: Array.from(this.players.values()),
            gameState: this.gameState,
            matchTimeRemaining: this.matchTimeRemaining,
            matchDuration: this.matchDuration,
        };
    }
    canStart() {
        return this.gameState === game_1.GameStateEnum.LOBBY && this.players.size >= 1;
    }
    startCountdown() {
        if (!this.canStart())
            return;
        this.gameState = game_1.GameStateEnum.COUNTDOWN;
        this.countdownValue = game_1.COUNTDOWN_SECONDS;
        // Emit immediately
        this.io.to(this.id).emit('matchStart', {
            room: this.getRoomState(),
            countdown: this.countdownValue,
        });
        this.countdownTimer = setInterval(() => {
            this.countdownValue -= 1;
            this.io.to(this.id).emit('countdownTick', { value: this.countdownValue });
            if (this.countdownValue <= 0) {
                if (this.countdownTimer)
                    clearInterval(this.countdownTimer);
                this.startMatch();
            }
        }, 1000);
    }
    startMatch() {
        this.gameState = game_1.GameStateEnum.PLAYING;
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
    endMatch() {
        if (this.matchTimer)
            clearInterval(this.matchTimer);
        this.gameState = game_1.GameStateEnum.MATCH_OVER;
        // Find winner (most kills)
        let winner = null;
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
    resetToLobby() {
        if (this.matchTimer)
            clearInterval(this.matchTimer);
        if (this.countdownTimer)
            clearInterval(this.countdownTimer);
        this.gameState = game_1.GameStateEnum.LOBBY;
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
    scheduleRespawn(playerId) {
        let spawnIndex = 0;
        let i = 0;
        for (const pid of this.players.keys()) {
            if (pid === playerId) {
                spawnIndex = i;
                break;
            }
            i++;
        }
        setTimeout(() => {
            if (!this.players.has(playerId))
                return;
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
        }, game_1.RESPAWN_DELAY_MS);
    }
    destroy() {
        if (this.matchTimer)
            clearInterval(this.matchTimer);
        if (this.countdownTimer)
            clearInterval(this.countdownTimer);
    }
    get playerCount() {
        return this.players.size;
    }
}
exports.GameRoom = GameRoom;
//# sourceMappingURL=GameRoom.js.map