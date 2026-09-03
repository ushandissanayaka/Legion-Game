import { Server } from 'socket.io';
import { GameRoom } from './GameRoom';
import { PlayerManager } from '../players/PlayerManager';
export declare class GameManager {
    private rooms;
    private playerManager;
    private io;
    constructor(io: Server, playerManager: PlayerManager);
    generateRoomId(): string;
    createRoom(hostId: string, matchDuration?: number): GameRoom;
    getRoom(roomId: string): GameRoom | undefined;
    deleteRoom(roomId: string): void;
    canJoinRoom(roomId: string): {
        ok: boolean;
        reason?: string;
    };
    getAllRooms(): GameRoom[];
}
//# sourceMappingURL=GameManager.d.ts.map