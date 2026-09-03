import { Server } from 'socket.io';
import { GameStateEnum, RoomState, PlayerState } from '../types/game';
import { PlayerManager } from '../players/PlayerManager';
export declare class GameRoom {
    id: string;
    hostId: string;
    gameState: GameStateEnum;
    matchTimeRemaining: number;
    matchDuration: number;
    players: Map<string, PlayerState>;
    playerManager: PlayerManager;
    private io;
    private matchTimer;
    private countdownTimer;
    private countdownValue;
    constructor(id: string, hostId: string, io: Server, playerManager: PlayerManager, matchDuration?: number);
    addPlayer(player: PlayerState): void;
    removePlayer(playerId: string): void;
    getRoomState(): RoomState;
    canStart(): boolean;
    startCountdown(): void;
    private startMatch;
    private endMatch;
    resetToLobby(): void;
    scheduleRespawn(playerId: string): void;
    destroy(): void;
    get playerCount(): number;
}
//# sourceMappingURL=GameRoom.d.ts.map