import React from 'react';
import type { RoomState, PlayerState } from '../types/game';

interface ScoreboardProps {
  room: RoomState;
  localPlayerId: string;
  timeRemaining: number;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ room, localPlayerId, timeRemaining }) => {
  function formatTime(s: number): string {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  const sorted = [...room.players].sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.deaths - b.deaths;
  });

  return (
    <div className="scoreboard-overlay">
      <div className="scoreboard-header">
        <h2>SCOREBOARD · {room.id}</h2>
        <div className="scoreboard-timer">{formatTime(timeRemaining)}</div>
      </div>

      <table className="scoreboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Kills</th>
            <th>Deaths</th>
            <th>K/D</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player, i) => {
            const kd = player.deaths === 0
              ? player.kills.toFixed(0)
              : (player.kills / player.deaths).toFixed(2);
            return (
              <tr key={player.id} className={player.id === localPlayerId ? 'is-you' : ''}>
                <td className="scoreboard-rank">{i + 1}</td>
                <td>
                  <span style={{ color: player.id === localPlayerId ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {player.name}
                  </span>
                  {player.id === room.hostId && (
                    <span className="player-badge badge-host" style={{ marginLeft: 8 }}>HOST</span>
                  )}
                </td>
                <td className="scoreboard-kills">{player.kills}</td>
                <td className="scoreboard-deaths">{player.deaths}</td>
                <td className="scoreboard-kd">{kd}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="scoreboard-hint">Hold TAB to view · Release to close</div>
    </div>
  );
};
