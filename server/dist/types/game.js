"use strict";
// ============================================================
// LEGION FPS — Server-side Shared Game Types (mirrors client)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.NETWORK_LAG_TOLERANCE_MS = exports.PLAYER_HITBOX_RADIUS = exports.SHOOT_RAYCAST_MAX_DISTANCE = exports.MAX_PLAYERS_PER_ROOM = exports.COUNTDOWN_SECONDS = exports.MATCH_DURATION_SECONDS = exports.RESPAWN_DELAY_MS = exports.PLAYER_MAX_HEALTH = exports.WEAPON_DAMAGE = exports.SPAWN_POSITIONS = exports.SOCKET_EVENTS = exports.GameStateEnum = void 0;
var GameStateEnum;
(function (GameStateEnum) {
    GameStateEnum["MENU"] = "MENU";
    GameStateEnum["LOBBY"] = "LOBBY";
    GameStateEnum["COUNTDOWN"] = "COUNTDOWN";
    GameStateEnum["PLAYING"] = "PLAYING";
    GameStateEnum["MATCH_OVER"] = "MATCH_OVER";
})(GameStateEnum || (exports.GameStateEnum = GameStateEnum = {}));
exports.SOCKET_EVENTS = {
    CREATE_ROOM: 'createRoom',
    JOIN_ROOM: 'joinRoom',
    LEAVE_ROOM: 'leaveRoom',
    PLAYER_MOVE: 'playerMove',
    PLAYER_SHOOT: 'playerShoot',
    START_MATCH: 'startMatch',
    PLAYER_READY: 'playerReady',
    ROOM_CREATED: 'roomCreated',
    ROOM_JOINED: 'roomJoined',
    PLAYER_JOINED: 'playerJoined',
    PLAYER_LEFT: 'playerLeft',
    GAME_STATE_UPDATE: 'gameStateUpdate',
    MATCH_START: 'matchStart',
    MATCH_TIME: 'matchTime',
    MATCH_END: 'matchEnd',
    PLAYER_HIT: 'playerHit',
    PLAYER_DEATH: 'playerDeath',
    PLAYER_RESPAWN: 'playerRespawn',
    PLAYER_POSITION: 'playerPosition',
    ERROR: 'error',
    COUNTDOWN_TICK: 'countdownTick',
};
// Spawn positions for the map (4 corners)
exports.SPAWN_POSITIONS = [
    { x: -28, y: 0, z: -28 },
    { x: 28, y: 0, z: -28 },
    { x: -28, y: 0, z: 28 },
    { x: 28, y: 0, z: 28 },
];
exports.WEAPON_DAMAGE = 25;
exports.PLAYER_MAX_HEALTH = 100;
exports.RESPAWN_DELAY_MS = 3000;
exports.MATCH_DURATION_SECONDS = 300; // 5 minutes
exports.COUNTDOWN_SECONDS = 3;
exports.MAX_PLAYERS_PER_ROOM = 4;
exports.SHOOT_RAYCAST_MAX_DISTANCE = 100;
exports.PLAYER_HITBOX_RADIUS = 0.6; // approximate radius for server-side hit validation
exports.NETWORK_LAG_TOLERANCE_MS = 500; // tolerate shots up to 500ms in the past
//# sourceMappingURL=game.js.map