"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const GameManager_1 = require("./game/GameManager");
const PlayerManager_1 = require("./players/PlayerManager");
const SocketHandlers_1 = require("./socket/SocketHandlers");
const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// CORS config
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});
app.use((0, cors_1.default)({
    origin: [CLIENT_URL, 'http://localhost:5173'],
    credentials: true,
}));
app.use(express_1.default.json());
// Health check
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        game: 'LEGION FPS',
        rooms: gameManager.getAllRooms().length,
        uptime: process.uptime(),
    });
});
// Initialize managers
const playerManager = new PlayerManager_1.PlayerManager();
const gameManager = new GameManager_1.GameManager(io, playerManager);
// Socket.IO connections
io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    (0, SocketHandlers_1.registerSocketHandlers)(io, socket, gameManager, playerManager);
});
httpServer.listen(PORT, () => {
    console.log(`\n🚀 LEGION FPS Server running on port ${PORT}`);
    console.log(`   Client origin: ${CLIENT_URL}`);
    console.log(`   Health check:  http://localhost:${PORT}/\n`);
});
//# sourceMappingURL=server.js.map