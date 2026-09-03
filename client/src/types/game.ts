// ============================================================
// LEGION FPS — Shared Game Types
// Shared between client and server (duplicated, not symlinked)
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
  yaw: number;   // horizontal (Y-axis) rotation in radians
  pitch: number; // vertical (X-axis) rotation in radians
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

export interface RoomState {
  id: string;
  hostId: string;
  players: PlayerState[];
  gameState: GameStateEnum;
  matchTimeRemaining: number; // seconds
  matchDuration: number;      // total match duration in seconds
}

export interface ShootEvent {
  shooterId: string;
  origin: Vector3Data;
  direction: Vector3Data;
  timestamp: number;
}

export interface DamageEvent {
  targetId: string;
  shooterId: string;
  damage: number;
  hitPosition: Vector3Data;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
}

export interface RespawnEvent {
  playerId: string;
  position: Vector3Data;
  health: number;
}

export interface ScoreUpdate {
  playerId: string;
  kills: number;
  deaths: number;
}

// ============================================================
// Socket Event Payloads (Client → Server)
// ============================================================

export interface CreateRoomPayload {
  playerName: string;
  matchDuration?: number; // seconds
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface PlayerMovePayload {
  roomId: string;
  position: Vector3Data;
  rotation: RotationData;
}

export interface PlayerShootPayload {
  roomId: string;
  origin: Vector3Data;
  direction: Vector3Data;
  timestamp: number;
}

export interface StartMatchPayload {
  roomId: string;
}

// ============================================================
// Socket Event Payloads (Server → Client)
// ============================================================

export interface RoomCreatedPayload {
  roomId: string;
  player: PlayerState;
  room: RoomState;
}

export interface RoomJoinedPayload {
  player: PlayerState;
  room: RoomState;
}

export interface PlayerJoinedPayload {
  player: PlayerState;
  room: RoomState;
}

export interface PlayerLeftPayload {
  playerId: string;
  newHostId: string | null;
  room: RoomState;
}

export interface GameStateUpdatePayload {
  room: RoomState;
}

export interface MatchStartPayload {
  room: RoomState;
  countdown: number;
}

export interface MatchTimePayload {
  timeRemaining: number;
}

export interface MatchEndPayload {
  room: RoomState;
  winner: PlayerState | null;
}

export interface PlayerHitPayload {
  targetId: string;
  shooterId: string;
  damage: number;
  newHealth: number;
}

export interface PlayerDeathPayload {
  victimId: string;
  killerId: string;
  killerName: string;
  victimName: string;
}

export interface PlayerRespawnPayload {
  playerId: string;
  position: Vector3Data;
  health: number;
}

export interface PlayerPositionPayload {
  playerId: string;
  position: Vector3Data;
  rotation: RotationData;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

// ============================================================
// Socket Event Names (constant reference)
// ============================================================

export const SOCKET_EVENTS = {
  // Client → Server
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  PLAYER_MOVE: 'playerMove',
  PLAYER_SHOOT: 'playerShoot',
  START_MATCH: 'startMatch',
  PLAYER_READY: 'playerReady',

  // Server → Client
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
