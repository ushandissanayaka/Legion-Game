import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { HUD } from './components/HUD';
import { Scoreboard } from './components/Scoreboard';
import { Results } from './components/Results';
import { Game } from './game/Game';
import { AudioManager } from './audio/AudioManager';
import { connectSocket, disconnectSocket } from './multiplayer/SocketClient';
import {
  GameStateEnum,
  SOCKET_EVENTS,
} from './types/game';
import type { PlayerState, RoomState } from './types/game';
import { Socket } from 'socket.io-client';
import type { WeaponType } from './weapons/Weapon';


// App — top-level game state machine
// MENU → LOBBY → COUNTDOWN → PLAYING → MATCH_OVER


type AppState = 'MENU' | 'CONNECTING' | 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'MATCH_OVER';

interface KillFeedItem {
  id: number;
  killerName: string;
  victimName: string;
  isYou: boolean;
}

let killFeedCounter = 0;

export default function App() {
  const [appState, setAppState] = useState<AppState>('MENU');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Room / player state
  const [room, setRoom] = useState<RoomState | null>(null);
  const [localPlayer, setLocalPlayer] = useState<PlayerState | null>(null);
  const [winner, setWinner] = useState<PlayerState | null>(null);

  // In-game HUD state (driven by game callbacks, not React game loop)
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [maxAmmo, setMaxAmmo] = useState(30);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isAlive, setIsAlive] = useState(true);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [botCount, setBotCount] = useState(0);
  const [weaponType, setWeaponType] = useState<WeaponType>('assault');
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>('assault');

  // Refs
  const gameRef = useRef<Game | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioManager>(new AudioManager());
  const socketRef = useRef<Socket | null>(null);
  const spawnIndexRef = useRef(0);
  const practiceAutoStartRef = useRef(false);

  // ── Socket setup ──────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setError('Cannot connect to server. Please try again.');
      setIsConnecting(false);
    });

    // ── Room events ─────────────────────────────────────────

    socket.on(SOCKET_EVENTS.ROOM_CREATED, ({ player, room: r }: { player: PlayerState; room: RoomState }) => {
      setLocalPlayer(player);
      setRoom(r);
      spawnIndexRef.current = 0;
      setAppState('LOBBY');
      setIsConnecting(false);

      if (practiceAutoStartRef.current) {
        practiceAutoStartRef.current = false;
        socket.emit(SOCKET_EVENTS.START_MATCH, { roomId: r.id });
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_JOINED, ({ player, room: r }: { player: PlayerState; room: RoomState }) => {
      setLocalPlayer(player);
      setRoom(r);
      spawnIndexRef.current = r.players.findIndex(p => p.id === player.id);
      setAppState('LOBBY');
      setIsConnecting(false);
    });

    socket.on(SOCKET_EVENTS.PLAYER_JOINED, ({ room: r }: { player: PlayerState; room: RoomState }) => {
      setRoom(r);
    });

    socket.on(SOCKET_EVENTS.PLAYER_LEFT, ({ room: r }: { playerId: string; room: RoomState }) => {
      setRoom(r);
    });

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, ({ room: r }: { room: RoomState }) => {
      setRoom(r);
    });

    // ── Match events ────────────────────────────────────────

    socket.on(SOCKET_EVENTS.MATCH_START, ({ room: r, countdown: c }: { room: RoomState; countdown: number }) => {
      setRoom(r);
      setCountdown(c);
      setAppState('COUNTDOWN');
      audioRef.current.playMatchStart();
    });

    socket.on(SOCKET_EVENTS.COUNTDOWN_TICK, ({ value }: { value: number }) => {
      setCountdown(value);
      audioRef.current.playCountdown();
    });

    socket.on(SOCKET_EVENTS.MATCH_TIME, ({ timeRemaining: t }: { timeRemaining: number }) => {
      setTimeRemaining(t);
    });

    socket.on(SOCKET_EVENTS.MATCH_END, ({ room: r, winner: w }: { room: RoomState; winner: PlayerState | null }) => {
      setRoom(r);
      setWinner(w);
      setAppState('MATCH_OVER');
      gameRef.current?.destroy();
      gameRef.current = null;
    });

    // ── Error 
    socket.on(SOCKET_EVENTS.ERROR, ({ message }: { message: string }) => {
      setError(message);
      setIsConnecting(false);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off(SOCKET_EVENTS.ROOM_CREATED);
      socket.off(SOCKET_EVENTS.ROOM_JOINED);
      socket.off(SOCKET_EVENTS.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.PLAYER_LEFT);
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE);
      socket.off(SOCKET_EVENTS.MATCH_START);
      socket.off(SOCKET_EVENTS.COUNTDOWN_TICK);
      socket.off(SOCKET_EVENTS.MATCH_TIME);
      socket.off(SOCKET_EVENTS.MATCH_END);
      socket.off(SOCKET_EVENTS.ERROR);
    };
  }, []);

  // ── Scoreboard key listener 
  useEffect(() => {
    if (appState !== 'PLAYING') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') { e.preventDefault(); setShowScoreboard(true); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') { e.preventDefault(); setShowScoreboard(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [appState]);

  // ── Game start ───────────────────────────────────────────
  const startGame = useCallback(() => {
    if (!canvasContainerRef.current || !socketRef.current || !localPlayer || !room) return;

    // Reset HUD state
    setHealth(100);
    setAmmo(30);
    setMaxAmmo(30);
    setKills(0);
    setDeaths(0);
    setKillFeed([]);
    setIsAlive(true);
    setIsPointerLocked(false);
    setCurrentWeapon(weaponType);
    setAppState('PLAYING');

    // Destroy previous game if any
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }

    const game = new Game(
      canvasContainerRef.current,
      socketRef.current,
      audioRef.current,
      localPlayer.id,
      room.id,
      spawnIndexRef.current,
      room.players,
      {
        onHealthChange: setHealth,
        onAmmoChange: (a, m) => { setAmmo(a); setMaxAmmo(m); },
        onKillsChange: (k, d) => { setKills(k); setDeaths(d); },
        onPointerLockChange: setIsPointerLocked,
        onAliveChange: setIsAlive,
        onWeaponChange: setCurrentWeapon,
        onKillFeed: (killerId, killerName, victimName) => {
          const isYou = killerId === localPlayer.id;
          const item: KillFeedItem = {
            id: killFeedCounter++,
            killerName,
            victimName,
            isYou,
          };
          setKillFeed(prev => [item, ...prev.slice(0, 4)]);
          setTimeout(() => {
            setKillFeed(prev => prev.filter(f => f.id !== item.id));
          }, 4000);
        },
        onRoomUpdate: setRoom,
      },
      botCount,
      weaponType
    );
    gameRef.current = game;
  }, [localPlayer, room, botCount, weaponType]);

  // ── Trigger game start when countdown finishes ───────────
  useEffect(() => {
    if (appState === 'COUNTDOWN' && countdown <= 0) {
      const timer = setTimeout(() => {
        startGame();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [appState, countdown, startGame]);

  // ── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
      audioRef.current.dispose();
      disconnectSocket();
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────
  const handleCreateRoom = (name: string, duration: number) => {
    setError(null);
    setIsConnecting(true);
    setBotCount(0);
    const socket = connectSocket();
    socketRef.current = socket;
    socket.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName: name, matchDuration: duration });
  };

  const handleStartPractice = (name: string, bots: number, duration: number, gun: WeaponType = 'assault') => {
    setError(null);
    setIsConnecting(true);
    setBotCount(bots);
    setWeaponType(gun);
    practiceAutoStartRef.current = true;
    const socket = connectSocket();
    socketRef.current = socket;
    socket.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName: name, matchDuration: duration });
  };

  const handleJoinRoom = (name: string, roomId: string) => {
    setError(null);
    setIsConnecting(true);
    setBotCount(0);
    const socket = connectSocket();
    socketRef.current = socket;
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, playerName: name });
  };

  const handleLeaveRoom = () => {
    if (room && socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: room.id });
    }
    gameRef.current?.destroy();
    gameRef.current = null;
    setRoom(null);
    setLocalPlayer(null);
    setAppState('MENU');
    setError(null);
  };

  const handleStartMatch = () => {
    if (room && socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.START_MATCH, { roomId: room.id });
    }
  };

  const handlePlayAgain = () => {
    if (room && socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: room.id });
      socketRef.current.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName: localPlayer?.name || 'Player' });
    }
  };

  const handleReturnLobby = () => {
    handleLeaveRoom();
  };

  // ── Click to play ────────────────────────────────────────
  const handleClickToPlay = () => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    const pointerLockTarget = canvas || canvasContainerRef.current;

    if (!pointerLockTarget) return;

    const request = pointerLockTarget.requestPointerLock();
    if (request) {
      request.catch(() => {
        setError('Click the game area to capture your mouse, or allow pointer lock in your browser.');
      });
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      {/* Vanilla Three.js canvas — always mounted when in-game, hidden otherwise */}
      <div
        id="game-canvas-container"
        ref={canvasContainerRef}
        style={{
          display: appState === 'PLAYING' || appState === 'COUNTDOWN' ? 'block' : 'none',
          width: '100vw',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* React UI layer */}
      <div id="ui-layer">
        {/* Main Menu */}
        {appState === 'MENU' || appState === 'CONNECTING' ? (
          <MainMenu
            audio={audioRef.current}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartPractice={handleStartPractice}
            isConnecting={isConnecting}
            error={error}
          />
        ) : null}

        {/* Lobby */}
        {appState === 'LOBBY' && room && localPlayer ? (
          <Lobby
            room={room}
            localPlayer={localPlayer}
            audio={audioRef.current}
            onStartMatch={handleStartMatch}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : null}

        {/* Countdown overlay */}
        {appState === 'COUNTDOWN' && (
          <div className="countdown-overlay">
            {countdown > 0 ? (
              <div className="countdown-number">{countdown}</div>
            ) : (
              <div className="countdown-go">GO!</div>
            )}
          </div>
        )}

        {/* In-game HUD */}
        {appState === 'PLAYING' && (
          <>
            <HUD
              health={health}
              ammo={ammo}
              maxAmmo={maxAmmo}
              kills={kills}
              deaths={deaths}
              timeRemaining={timeRemaining}
              isPointerLocked={isPointerLocked}
              isAlive={isAlive}
              killFeed={killFeed}
              weaponType={currentWeapon}
              onClickToPlay={handleClickToPlay}
            />
            {showScoreboard && room && localPlayer && (
              <Scoreboard
                room={room}
                localPlayerId={localPlayer.id}
                timeRemaining={timeRemaining}
              />
            )}
          </>
        )}

        {/* Results screen */}
        {appState === 'MATCH_OVER' && room && localPlayer ? (
          <Results
            room={room}
            winner={winner}
            localPlayerId={localPlayer.id}
            audio={audioRef.current}
            onPlayAgain={handlePlayAgain}
            onReturnLobby={handleReturnLobby}
          />
        ) : null}

        {/* Connection status */}
        {(appState === 'PLAYING' || appState === 'LOBBY') && !isConnected && (
          <div className="connection-status">
            ⚠ Connection lost — reconnecting…
          </div>
        )}
      </div>
    </>
  );
}
