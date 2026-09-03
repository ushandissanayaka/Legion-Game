import { PlayerState, Vector3Data, RotationData } from '../types/game';
export declare class PlayerManager {
    private players;
    createPlayer(id: string, name: string, roomId: string, spawnIndex: number, isHost: boolean): PlayerState;
    getPlayer(id: string): PlayerState | undefined;
    removePlayer(id: string): void;
    updatePosition(id: string, position: Vector3Data, rotation: RotationData): boolean;
    applyDamage(targetId: string, damage: number): {
        newHealth: number;
        died: boolean;
    };
    addKill(killerId: string): void;
    respawnPlayer(id: string, spawnIndex: number): Vector3Data | null;
    setHost(id: string, isHost: boolean): void;
    getAllPlayers(): PlayerState[];
    getPlayersInRoom(roomId: string): PlayerState[];
}
//# sourceMappingURL=PlayerManager.d.ts.map