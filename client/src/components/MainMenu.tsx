import React, { useState } from 'react';
import { AudioManager } from '../audio/AudioManager';
import type { WeaponType } from '../weapons/Weapon';

interface MainMenuProps {
  audio: AudioManager;
  onCreateRoom: (name: string, duration: number) => void;
  onJoinRoom: (name: string, roomId: string) => void;
  onStartPractice: (name: string, botCount: number, duration: number, gun: WeaponType) => void;
  isConnecting: boolean;
  error: string | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  audio,
  onCreateRoom,
  onJoinRoom,
  onStartPractice,
  isConnecting,
  error,
}) => {
  const [playerName,    setPlayerName]    = useState('');
  const [matchDuration, setMatchDuration] = useState(180);
  const [botCount,      setBotCount]      = useState(5);
  const [joinRoomId,    setJoinRoomId]    = useState('');
  const [tab,           setTab]           = useState<'create' | 'join' | 'practice'>('practice');
  const [selectedGun,   setSelectedGun]   = useState<WeaponType>('assault');

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

  const handlePractice = () => {
    if (!playerName.trim()) return;
    audio.playClick();
    onStartPractice(playerName.trim(), botCount, matchDuration, selectedGun);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (tab === 'create')   handleCreate();
      else if (tab === 'join') handleJoin();
      else                    handlePractice();
    }
  };

  // Shared duration selector
  const DurationSelect = () => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
        Match Duration
      </label>
      <select
        className="input-field"
        value={matchDuration}
        onChange={e => setMatchDuration(Number(e.target.value))}
        style={{ cursor: 'pointer', appearance: 'auto' }}
      >
        <option value={60}>1 Minute</option>
        <option value={120}>2 Minutes</option>
        <option value={180}>3 Minutes</option>
        <option value={240}>4 Minutes</option>
        <option value={300}>5 Minutes</option>
      </select>
    </div>
  );

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
          <h2>Your Callsign</h2>
          <input
            id="player-name-input"
            className="input-field"
            type="text"
            placeholder="Enter your callsign…"
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
            id="tab-practice"
            className={`btn ${tab === 'practice' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setTab('practice'); audio.playClick(); }}
          >
            🎯 Practice
          </button>
          <button
            id="tab-create"
            className={`btn ${tab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setTab('create'); audio.playClick(); }}
          >
            ⚡ Create
          </button>
          <button
            id="tab-join"
            className={`btn ${tab === 'join' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => { setTab('join'); audio.playClick(); }}
          >
            → Join
          </button>
        </div>

        {/* ── PRACTICE TAB ──────────────────────────────────── */}
        {tab === 'practice' && (
          <div className="menu-card" style={{ marginTop: 0 }}>
            <h2>Solo Practice Mode</h2>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Sharpen your aim against AI bots. No server needed after start.
            </p>

            {/* Bot Count */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                Number of Bots &nbsp;
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: 18 }}>
                  {botCount}
                </span>
              </label>
              <input
                type="range"
                min={2} max={10} step={1}
                value={botCount}
                onChange={e => setBotCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginBottom: 8 }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)',
              }}>
                {[2,3,4,5,6,7,8,9,10].map(n => (
                  <span
                    key={n}
                    style={{ cursor: 'pointer', color: n === botCount ? 'var(--accent-primary)' : undefined }}
                    onClick={() => setBotCount(n)}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <DurationSelect />

            {/* Weapon Selection */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                Select Weapon
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { id: 'assault' as WeaponType, label: 'Assault Rifle', emoji: '🔫', desc: '25 dmg · Fast' },
                  { id: 'shotgun' as WeaponType, label: 'Shotgun',       emoji: '💥', desc: '15×8 · Close' },
                  { id: 'sniper'  as WeaponType, label: 'Sniper',        emoji: '🎯', desc: '100 dmg · Slow' },
                ] as const).map(g => (
                  <button
                    key={g.id}
                    id={`weapon-${g.id}`}
                    onClick={() => { setSelectedGun(g.id); audio.playClick(); }}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      borderRadius: 8,
                      border: selectedGun === g.id
                        ? '2px solid var(--accent-primary)'
                        : '2px solid rgba(255,255,255,0.1)',
                      background: selectedGun === g.id
                        ? 'rgba(var(--accent-primary-rgb, 255,100,0), 0.15)'
                        : 'rgba(255,255,255,0.04)',
                      color: selectedGun === g.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: 'var(--font-ui)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{g.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{g.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              id="start-practice-btn"
              className="btn btn-primary"
              onClick={handlePractice}
              disabled={isConnecting || !playerName.trim()}
            >
              {isConnecting ? 'Starting…' : '🎯 Start Practice'}
            </button>
          </div>
        )}

        {/* ── CREATE TAB ────────────────────────────────────── */}
        {tab === 'create' && (
          <div className="menu-card" style={{ marginTop: 0 }}>
            <h2>Host a New Match</h2>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              A room code will be generated that you can share with friends.
            </p>

            <DurationSelect />

            <button
              id="create-room-btn"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isConnecting || !playerName.trim()}
            >
              {isConnecting ? 'Connecting…' : '⚡ Create Room'}
            </button>
          </div>
        )}

        {/* ── JOIN TAB ──────────────────────────────────────── */}
        {tab === 'join' && (
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
            <span className="key">Left Click</span><span className="action">Shoot</span>
            <span className="key">Shift</span><span className="action">Sprint</span>
            <span className="key">Tab</span><span className="action">Scoreboard</span>
            <span className="key">R</span><span className="action">Reload</span>
          </div>
        </div>

      </div>
    </div>
  );
};
