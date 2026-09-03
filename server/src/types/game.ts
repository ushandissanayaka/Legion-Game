// ============================================================
// LEGION FPS — Server-side Shared Game Types (mirrors client)
// ============================================================

export enum GameStateEnum {
  MENU = 'MENU',
  LOBBY = 'LOBBY',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  MATCH_OVER = 'MATCH_OVER',
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
  matchDuration?: number; // seconds
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

export const SOCKET_EVENTS = {
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
} as const;

// Spawn positions for the map (4 corners)
export const SPAWN_POSITIONS: Vector3Data[] = [
  { x: -28, y: 0, z: -28 },
  { x:  28, y: 0, z: -28 },
  { x: -28, y: 0, z:  28 },
  { x:  28, y: 0, z:  28 },
];

export const WEAPON_DAMAGE = 25;
export const PLAYER_MAX_HEALTH = 100;
export const RESPAWN_DELAY_MS = 3000;
export const MATCH_DURATION_SECONDS = 300; // 5 minutes
export const COUNTDOWN_SECONDS = 3;
export const MAX_PLAYERS_PER_ROOM = 4;
export const SHOOT_RAYCAST_MAX_DISTANCE = 100;
export const PLAYER_HITBOX_RADIUS = 0.6; // approximate radius for server-side hit validation
export const NETWORK_LAG_TOLERANCE_MS = 500; // tolerate shots up to 500ms in the past
