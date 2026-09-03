import React from 'react';
import type { RoomState, PlayerState } from '../types/game';
import { AudioManager } from '../audio/AudioManager';

interface ResultsProps {
  room: RoomState;
  winner: PlayerState | null;
  localPlayerId: string;
  audio: AudioManager;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export const Results: React.FC<ResultsProps> = ({
  room,
  winner,
  localPlayerId,
  audio,
  onPlayAgain,
  onReturnLobby,
}) => {
  const sorted = [...room.players].sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.deaths - b.deaths;
  });

  const isLocalWinner = winner?.id === localPlayerId;

  return (
    <div className="results-screen">
      <div className="results-title">
        {isLocalWinner ? '🏆 VICTORY' : 'MATCH OVER'}
      </div>

      {winner && (
        <div className="winner-display">
          <div className="winner-label">Winner</div>
          <div className="winner-name">{winner.name}</div>
          <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)', marginTop: 4 }}>
            {winner.kills} kills
          </div>
        </div>
      )}

      <div className="results-table-container">
        <table className="scoreboard-table" style={{ width: '100%' }}>
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
                  <td className="scoreboard-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</td>
                  <td style={{ color: player.id === localPlayerId ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {player.name}
                  </td>
                  <td className="scoreboard-kills">{player.kills}</td>
                  <td className="scoreboard-deaths">{player.deaths}</td>
                  <td className="scoreboard-kd">{kd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="results-actions">
        <button
          id="play-again-btn"
          className="btn btn-primary"
          onClick={() => { audio.playClick(); onPlayAgain(); }}
        >
          ⚡ Play Again
        </button>
        <button
          id="return-lobby-btn"
          className="btn btn-secondary"
          onClick={() => { audio.playClick(); onReturnLobby(); }}
        >
          ← Return to Lobby
        </button>
      </div>
    </div>
  );
};
