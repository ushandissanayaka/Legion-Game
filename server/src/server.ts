import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './game/GameManager';
import { PlayerManager } from './players/PlayerManager';
import { registerSocketHandlers } from './socket/SocketHandlers';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// CORS config
const io = new Server(httpServer, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

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
const playerManager = new PlayerManager();
const gameManager = new GameManager(io, playerManager);

// Socket.IO connections
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  registerSocketHandlers(io, socket, gameManager, playerManager);
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀 LEGION FPS Server running on port ${PORT}`);
  console.log(`   Client origin: ${CLIENT_URL}`);
  console.log(`   Health check:  http://localhost:${PORT}/\n`);
});
