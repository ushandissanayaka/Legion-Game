export declare enum GameStateEnum {
    MENU = "MENU",
    LOBBY = "LOBBY",
    COUNTDOWN = "COUNTDOWN",
    PLAYING = "PLAYING",
    MATCH_OVER = "MATCH_OVER"
}
export interface Vector3Data {
    x: number;
    y: number;
    z: number;
}
export interface RotationData {
    yaw: number;
    pitch: number;
}
export interface PlayerState {
    id: string;
    name: string;
    roomId: string;
    position: Vector3Data;
    rotation: RotationData;
    health: number;
    alive: boolean;
    kills: number;
    deaths: number;
    isHost: boolean;
}
export interface CreateRoomPayload {
    playerName: string;
    matchDuration?: number;
}
export interface RoomState {
    id: string;
    hostId: string;
    players: PlayerState[];
    gameState: GameStateEnum;
    matchTimeRemaining: number;
    matchDuration: number;
}
export interface ShootEvent {
    shooterId: string;
    origin: Vector3Data;
    direction: Vector3Data;
    timestamp: number;
}
export declare const SOCKET_EVENTS: {
    readonly CREATE_ROOM: 'createRoom';
    readonly JOIN_ROOM: 'joinRoom';
    readonly LEAVE_ROOM: 'leaveRoom';
    readonly PLAYER_MOVE: 'playerMove';
    readonly PLAYER_SHOOT: 'playerShoot';
    readonly START_MATCH: 'startMatch';
    readonly PLAYER_READY: 'playerReady';
    readonly ROOM_CREATED: 'roomCreated';
    readonly ROOM_JOINED: 'roomJoined';
    readonly PLAYER_JOINED: 'playerJoined';
    readonly PLAYER_LEFT: 'playerLeft';
    readonly GAME_STATE_UPDATE: 'gameStateUpdate';
    readonly MATCH_START: 'matchStart';
    readonly MATCH_TIME: 'matchTime';
    readonly MATCH_END: 'matchEnd';
    readonly PLAYER_HIT: 'playerHit';
    readonly PLAYER_DEATH: 'playerDeath';
    readonly PLAYER_RESPAWN: 'playerRespawn';
    readonly PLAYER_POSITION: 'playerPosition';
    readonly ERROR: 'error';
    readonly COUNTDOWN_TICK: 'countdownTick';
};
export declare const SPAWN_POSITIONS: Vector3Data[];
export declare const WEAPON_DAMAGE = 25;
export declare const PLAYER_MAX_HEALTH = 100;
export declare const RESPAWN_DELAY_MS = 3000;
export declare const MATCH_DURATION_SECONDS = 300;
export declare const COUNTDOWN_SECONDS = 3;
export declare const MAX_PLAYERS_PER_ROOM = 4;
export declare const SHOOT_RAYCAST_MAX_DISTANCE = 100;
export declare const PLAYER_HITBOX_RADIUS = 0.6;
export declare const NETWORK_LAG_TOLERANCE_MS = 500;
//# sourceMappingURL=game.d.ts.map