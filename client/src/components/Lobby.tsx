import React, { useState } from 'react';
import type { RoomState, PlayerState } from '../types/game';
import { AudioManager } from '../audio/AudioManager';

interface LobbyProps {
  room: RoomState;
  localPlayer: PlayerState;
  audio: AudioManager;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  localPlayer,
  audio,
  onStartMatch,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const isHost = localPlayer.id === room.hostId;

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    audio.playClick();
  };

  const AVATAR_COLORS = ['#00e5ff', '#ff2d55', '#ffbe00', '#39ff6e'];

  return (
    <div className="lobby">
      <div className="lobby-content">
        {/* Header */}
        <div className="lobby-header">
          <h1>LEGION — LOBBY</h1>
          <div className="room-id-display">
            <div className="room-id-badge" onClick={copyRoomId} style={{ cursor: 'pointer' }} title="Click to copy">
              {room.id}
            </div>
          </div>
          <p className="copy-hint" style={{ marginTop: 8 }}>
            {copied ? '✓ Copied to clipboard!' : 'Click room code to copy · Share with friends'}
          </p>
        </div>

        {/* Player list */}
        <div className="player-list">
          <div className="player-list-header">
            <span>Players in Lobby</span>
            <span>{room.players.length} / 4</span>
          </div>

          {room.players.map((player, i) => (
            <div
              key={player.id}
              className={`player-item ${player.id === localPlayer.id ? 'is-you' : ''}`}
            >
              <div
                className={`player-avatar avatar-${i % 4}`}
                style={{ color: AVATAR_COLORS[i % 4] }}
              >
                {player.name.substring(0, 1).toUpperCase()}
              </div>
              <span className="player-name-display">{player.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {player.id === room.hostId && (
                  <span className="player-badge badge-host">HOST</span>
                )}
                {player.id === localPlayer.id && (
                  <span className="player-badge badge-you">YOU</span>
                )}
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 4 - room.players.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="player-item" style={{ opacity: 0.3 }}>
              <div className="player-avatar" style={{ background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.1)', color: 'transparent' }}>
                -
              </div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Waiting for player…
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          {isHost ? (
            <button
              id="start-match-btn"
              className="btn btn-primary"
              onClick={() => { audio.playClick(); onStartMatch(); }}
              disabled={room.players.length < 1}
            >
              {room.players.length < 2
                ? '⚡ Start Solo Practice'
                : `⚡ Start Match (${room.players.length} Players)`}
            </button>
          ) : (
            <div className="menu-card" style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)', fontSize: 14 }}>
                Waiting for the host to start the match…
              </p>
            </div>
          )}

          <button
            id="leave-room-btn"
            className="btn btn-danger"
            onClick={() => { audio.playClick(); onLeaveRoom(); }}
          >
            ← Leave Room
          </button>
        </div>
      </div>
    </div>
  );
};
