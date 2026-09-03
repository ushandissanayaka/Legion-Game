import React, { useState } from 'react';
import { AudioManager } from '../audio/AudioManager';

interface MainMenuProps {
  audio: AudioManager;
  onCreateRoom: (name: string, duration: number) => void;
  onJoinRoom: (name: string, roomId: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  audio,
  onCreateRoom,
  onJoinRoom,
  isConnecting,
  error,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [matchDuration, setMatchDuration] = useState(300); // Default 5 mins
  const [joinRoomId, setJoinRoomId] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  const handleCreate = () => {
    if (!playerName.trim()) return;
    audio.playClick();
    onCreateRoom(playerName.trim(), matchDuration);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    audio.playClick();
    onJoinRoom(playerName.trim(), joinRoomId.trim().toUpperCase());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (tab === 'create') handleCreate();
      else handleJoin();
    }
  };

  return (
    <div className="main-menu">
      <div className="menu-content">
        {/* Title */}
        <div className="game-title">
          <h1>LEGION</h1>
          <p className="subtitle">3D Multiplayer FPS</p>
        </div>

        {/* Player Name */}
        <div className="menu-card">
          <h2>Player Identity</h2>
          <input
            id="player-name-input"
            className="input-field"
            type="text"
            placeholder="Enter your callsign..."
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={handleKey}
            maxLength={20}
            autoFocus
          />
        </div>

        {/* Error */}
        {error && <div className="error-msg">⚠ {error}</div>}

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button
            id="tab-create"
            className={`btn ${tab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setTab('create'); audio.playClick(); }}
          >
            Create Room
          </button>
          <button
            id="tab-join"
            className={`btn ${tab === 'join' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setTab('join'); audio.playClick(); }}
          >
            Join Room
          </button>
        </div>

        {tab === 'create' ? (
          <div className="menu-card" style={{ marginTop: 0 }}>
            <h2>Host a New Match</h2>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              A room code will be generated that you can share with friends.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                Match Duration
              </label>
              <select 
                className="input-field" 
                value={matchDuration}
                onChange={(e) => setMatchDuration(Number(e.target.value))}
                style={{ cursor: 'pointer', appearance: 'auto' }}
              >
                <option value={60}>1 Minute</option>
                <option value={120}>2 Minutes</option>
                <option value={180}>3 Minutes</option>
                <option value={240}>4 Minutes</option>
                <option value={300}>5 Minutes</option>
              </select>
            </div>

            <button
              id="create-room-btn"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isConnecting || !playerName.trim()}
            >
              {isConnecting ? 'Connecting…' : '⚡ Create Room'}
            </button>
          </div>
        ) : (
          <div className="menu-card" style={{ marginTop: 0 }}>
            <h2>Join Existing Room</h2>
            <input
              id="room-id-input"
              className="input-field"
              type="text"
              placeholder="Enter Room Code (e.g. A7K92)"
              value={joinRoomId}
              onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
              onKeyDown={handleKey}
              maxLength={5}
            />
            <button
              id="join-room-btn"
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={isConnecting || !playerName.trim() || !joinRoomId.trim()}
            >
              {isConnecting ? 'Joining…' : '→ Join Room'}
            </button>
          </div>
        )}

        {/* Controls reference */}
        <div className="menu-card" style={{ marginTop: 0 }}>
          <h2>Controls</h2>
          <div className="controls-info">
            <span className="key">WASD</span><span className="action">Move</span>
            <span className="key">Mouse</span><span className="action">Aim</span>
            <span className="key">LMB</span><span className="action">Shoot</span>
            <span className="key">Shift</span><span className="action">Sprint</span>
            <span className="key">Tab</span><span className="action">Scoreboard</span>
            <span className="key">R</span><span className="action">Reload</span>
          </div>
        </div>
      </div>
    </div>
  );
};
