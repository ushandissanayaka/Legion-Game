# Legion FPS

Legion is a lightweight, original browser-based 3D multiplayer first-person shooter built with React, Three.js, and Socket.IO.

## Local Development

You need to run both the frontend client and the multiplayer server simultaneously.

### 1. Start the Multiplayer Server
```bash
cd server
npm install
npm run dev
```
*Runs on `http://localhost:3001`*

### 2. Start the Frontend Client
Open a new terminal tab:
```bash
cd client
npm install
npm run dev
```
*Runs on `http://localhost:5173`*

Open `http://localhost:5173` in your browser. You can open multiple tabs to test multiplayer!

## Deployment

### Frontend (Vercel)
1. Import the `client` directory to Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set Environment Variable: `VITE_SERVER_URL=https://your-server-url.com`

### Backend Server
Deploy the `server` directory to a platform that supports WebSockets (like Render, Railway, or Fly.io).
Ensure you set the Environment Variables:
- `CLIENT_URL=https://your-vercel-app-url.vercel.app`
- `PORT` (usually provided by the host)

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Three.js, React Three Fiber, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Audio**: Web Audio API (Synthesized sounds, no assets needed)
