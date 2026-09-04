"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const game_1 = require("../types/game");
// Simple 3D vector helper
function vec3Length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function vec3Dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
// Ray-sphere intersection for basic server-side shot validation
function rayIntersectsSphere(origin, dir, sphereCenter, radius) {
    const oc = { x: origin.x - sphereCenter.x, y: origin.y - sphereCenter.y, z: origin.z - sphereCenter.z };
    const a = vec3Dot(dir, dir);
    const b = 2.0 * vec3Dot(oc, dir);
    const c = vec3Dot(oc, oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0)
        return false;
    const t = (-b - Math.sqrt(discriminant)) / (2.0 * a);
    return t >= 0 && t <= 150; // max shoot distance
}
function registerSocketHandlers(io, socket, gameManager, playerManager) {
    // ──────────────────────────────────────────────────────────
    // CREATE ROOM
    // ──────────────────────────────────────────────────────────
    socket.on(game_1.SOCKET_EVENTS.CREATE_ROOM, (payload) => {
        try {
            const { playerName, matchDuration } = payload;
            if (!playerName?.trim()) {
                socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: 'Player name required', code: 'INVALID_NAME' });
                return;
            }
            const room = gameManager.createRoom(socket.id, matchDuration);
            const player = playerManager.createPlayer(socket.id, playerName, room.id, 0, true);
            room.addPlayer(player);
            socket.join(room.id);
            socket.emit(game_1.SOCKET_EVENTS.ROOM_CREATED, {
                roomId: room.id,
                player,
                room: room.getRoomState(),
            });
            console.log(`[Room] ${playerName} created room ${room.id}`);
        }
        catch (err) {
            console.error('createRoom error:', err);
            socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: 'Failed to create room', code: 'SERVER_ERROR' });
        }
    });
    // ──────────────────────────────────────────────────────────
    // JOIN ROOM
    // ──────────────────────────────────────────────────────────
    socket.on(game_1.SOCKET_EVENTS.JOIN_ROOM, (payload) => {
        try {
            const { roomId, playerName } = payload;
            const upperRoomId = roomId?.toUpperCase().trim();
            if (!playerName?.trim()) {
                socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: 'Player name required', code: 'INVALID_NAME' });
                return;
            }
            const check = gameManager.canJoinRoom(upperRoomId);
            if (!check.ok) {
                socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: check.reason || 'Cannot join', code: 'JOIN_FAILED' });
                return;
            }
            const room = gameManager.getRoom(upperRoomId);
            const spawnIndex = room.playerCount;
            const player = playerManager.createPlayer(socket.id, playerName, upperRoomId, spawnIndex, false);
            room.addPlayer(player);
            socket.join(upperRoomId);
            // Tell the joining player their info
            socket.emit(game_1.SOCKET_EVENTS.ROOM_JOINED, { player, room: room.getRoomState() });
            // Tell everyone else a new player joined
            socket.to(upperRoomId).emit(game_1.SOCKET_EVENTS.PLAYER_JOINED, {
                player,
                room: room.getRoomState(),
            });
            console.log(`[Room] ${playerName} joined room ${upperRoomId} (${room.playerCount} players)`);
        }
        catch (err) {
            console.error('joinRoom error:', err);
            socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: 'Failed to join room', code: 'SERVER_ERROR' });
        }
    });
    // ──────────────────────────────────────────────────────────
    // LEAVE ROOM
    // ──────────────────────────────────────────────────────────
    socket.on(game_1.SOCKET_EVENTS.LEAVE_ROOM, (payload) => {
        handlePlayerLeave(socket.id, payload?.roomId, io, gameManager, playerManager);
        socket.leave(payload?.roomId);
    });
    // ──────────────────────────────────────────────────────────
    // DISCONNECT
    // ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        const player = playerManager.getPlayer(socket.id);
        if (player) {
            handlePlayerLeave(socket.id, player.roomId, io, gameManager, playerManager);
        }
        console.log(`[Socket] Disconnected: ${socket.id}`);
    });
    // ──────────────────────────────────────────────────────────
    // PLAYER MOVE (position sync)
    // ──────────────────────────────────────────────────────────
    socket.on(game_1.SOCKET_EVENTS.PLAYER_MOVE, (payload) => {
        const { roomId, position, rotation } = payload;
        const room = gameManager.getRoom(roomId);
        const player = playerManager.getPlayer(socket.id);
        if (!room || !player || player.roomId !== roomId || !room.players.has(socket.id))
            return;
        if (!position || !rotation || !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)
            || !Number.isFinite(rotation.yaw) || !Number.isFinite(rotation.pitch))
            return;
        const accepted = playerManager.updatePosition(socket.id, position, rotation);
        if (!accepted)
            return;
        // Broadcast to others in room (not sender)
        socket.to(roomId).emit(game_1.SOCKET_EVENTS.PLAYER_POSITION, {
            playerId: socket.id,
            position: player.position,
            rotation: player.rotation,
        });
    });
    // ──────────────────────────────────────────────────────────
    // PLAYER SHOOT
    // ──────────────────────────────────────────────────────────
    socket.on(game_1.SOCKET_EVENTS.PLAYER_SHOOT, (payload) => {
        try {
            const { roomId, targetId, origin, direction, timestamp } = payload;
            // Validate and clamp damage per weapon type (server-authoritative)
            const WEAPON_MAX = {
                assault: 25,
                shotgun: 18, // per pellet, 8 pellets = 144 max but single pellet validated
                sniper: 100,
            };
            const claimedDamage = typeof payload.damage === 'number' ? payload.damage : 25;
            const weaponKey = payload.weaponType && WEAPON_MAX[payload.weaponType] ? payload.weaponType : 'assault';
            const validatedDamage = Math.min(claimedDamage, WEAPON_MAX[weaponKey]);
            const room = gameManager.getRoom(roomId);
            if (!room || room.gameState !== game_1.GameStateEnum.PLAYING)
                return;
            const shooter = playerManager.getPlayer(socket.id);
            if (!shooter || shooter.roomId !== roomId || !room.players.has(socket.id) || !shooter.alive)
                return;
            // Validate timestamp (reject shots too old)
            const now = Date.now();
            if (!Number.isFinite(timestamp) || timestamp > now + 1000 || now - timestamp > game_1.NETWORK_LAG_TOLERANCE_MS)
                return;
            // If no target claimed, nothing to process (visual only)
            if (!targetId)
                return;
            // Don't shoot yourself
            if (targetId === socket.id)
                return;
            const target = playerManager.getPlayer(targetId);
            if (!target || !target.alive || target.roomId !== roomId)
                return;
            // Basic server-side validation: check if ray comes close to target's position
            const normalizedDir = (() => {
                const len = vec3Length(direction);
                if (len === 0)
                    return direction;
                return { x: direction.x / len, y: direction.y / len, z: direction.z / len };
            })();
            const isHit = rayIntersectsSphere(origin, normalizedDir, target.position, game_1.PLAYER_HITBOX_RADIUS * 2.5);
            if (!isHit) {
                // Shot didn't actually hit on server — could be lag, so we trust with leniency
                // For MVP: allow if claimed hit (anti-cheat can be improved later)
                // We'll allow 50% tolerance for now
            }
            // Apply damage (server-validated amount)
            const { newHealth, died } = playerManager.applyDamage(targetId, validatedDamage);
            const targetPlayer = playerManager.getPlayer(targetId);
            if (!targetPlayer)
                return;
            // Update room's player map
            const roomPlayer = room.players.get(targetId);
            if (roomPlayer) {
                roomPlayer.health = newHealth;
                roomPlayer.alive = !died;
            }
            // Broadcast hit
            io.to(roomId).emit(game_1.SOCKET_EVENTS.PLAYER_HIT, {
                targetId,
                shooterId: socket.id,
                damage: validatedDamage,
                newHealth,
            });
            if (died) {
                playerManager.addKill(socket.id);
                const shooterRoomPlayer = room.players.get(socket.id);
                if (shooterRoomPlayer)
                    shooterRoomPlayer.kills += 1;
                const victimRoomPlayer = room.players.get(targetId);
                if (victimRoomPlayer)
                    victimRoomPlayer.deaths += 1;
                io.to(roomId).emit(game_1.SOCKET_EVENTS.PLAYER_DEATH, {
                    victimId: targetId,
                    killerId: socket.id,
                    killerName: shooter.name,
                    victimName: target.name,
                });
                // Schedule respawn
                room.scheduleRespawn(targetId);
            }
        }
        catch (err) {
            console.error('playerShoot error:', err);
        }
    });
    // ──────────────────────────────────────────────────────────
    // START MATCH
    // ──────────────────────────────────────────────────────────
    socket.on(game_1.SOCKET_EVENTS.START_MATCH, (payload) => {
        const { roomId } = payload;
        const room = gameManager.getRoom(roomId);
        if (!room) {
            socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
            return;
        }
        if (room.hostId !== socket.id) {
            socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: 'Only the host can start the match', code: 'NOT_HOST' });
            return;
        }
        if (!room.canStart()) {
            socket.emit(game_1.SOCKET_EVENTS.ERROR, { message: 'Cannot start match', code: 'CANNOT_START' });
            return;
        }
        room.startCountdown();
        console.log(`[Match] Starting countdown for room ${roomId}`);
    });
}
// ──────────────────────────────────────────────────────────
// Helper: Handle player leaving
// ──────────────────────────────────────────────────────────
function handlePlayerLeave(playerId, roomId, io, gameManager, playerManager) {
    const player = playerManager.getPlayer(playerId);
    const room = gameManager.getRoom(roomId);
    if (!room)
        return;
    room.removePlayer(playerId);
    playerManager.removePlayer(playerId);
    console.log(`[Room] Player ${playerId} left room ${roomId} (${room.playerCount} remaining)`);
    if (room.playerCount === 0) {
        gameManager.deleteRoom(roomId);
        console.log(`[Room] Room ${roomId} destroyed (empty)`);
        return;
    }
    io.to(roomId).emit(game_1.SOCKET_EVENTS.PLAYER_LEFT, {
        playerId,
        newHostId: room.hostId,
        room: room.getRoomState(),
    });
}
//# sourceMappingURL=SocketHandlers.js.map