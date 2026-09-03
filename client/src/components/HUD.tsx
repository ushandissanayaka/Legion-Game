import React, { useEffect, useRef, useState } from 'react';

interface KillFeedItem {
  id: number;
  killerName: string;
  victimName: string;
  isYou: boolean;
}

interface HUDProps {
  health: number;
  ammo: number;
  maxAmmo: number;
  kills: number;
  deaths: number;
  timeRemaining: number;
  isPointerLocked: boolean;
  isAlive: boolean;
  killFeed: KillFeedItem[];
  onClickToPlay: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getHealthColor(hp: number): string {
  if (hp > 60) return '#39ff6e';
  if (hp > 30) return '#ffbe00';
  return '#ff2d55';
}

export const HUD: React.FC<HUDProps> = ({
  health,
  ammo,
  maxAmmo,
  kills,
  deaths,
  timeRemaining,
  isPointerLocked,
  isAlive,
  killFeed,
  onClickToPlay,
}) => {
  const [showHitMarker, setShowHitMarker] = useState(false);
  const [crosshairHit, setCrosshairHit] = useState(false);
  const hitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose flash method globally for game engine to call
  useEffect(() => {
    (window as any).__hudShowHit = () => {
      setShowHitMarker(true);
      setCrosshairHit(true);
      if (hitTimeout.current) clearTimeout(hitTimeout.current);
      hitTimeout.current = setTimeout(() => {
        setShowHitMarker(false);
        setCrosshairHit(false);
      }, 350);
    };
    return () => { delete (window as any).__hudShowHit; };
  }, []);

  return (
    <div className="hud">
      {/* Click to play overlay */}
      {!isPointerLocked && (
        <div className="click-to-play" onClick={onClickToPlay}>
          <div className="pulse-ring" />
          <h2>CLICK TO PLAY</h2>
          <p>Your cursor will be captured · Press ESC to release</p>
        </div>
      )}

      {/* Death overlay */}
      {isPointerLocked && !isAlive && (
        <div className="death-overlay">
          <div className="death-text">ELIMINATED</div>
          <div className="respawn-text">Respawning in 3 seconds…</div>
        </div>
      )}

      {isPointerLocked && (
        <>
          {/* Crosshair */}
          <div className={`crosshair ${crosshairHit ? 'hit' : ''}`} />

          {/* Hit marker */}
          {showHitMarker && <div className="hit-marker" key={Date.now()} />}

          {/* Top bar */}
          <div className="hud-top">
            <div className={`hud-timer ${timeRemaining <= 30 ? 'danger' : ''}`}>
              {formatTime(timeRemaining)}
            </div>
            <div className="hud-score">
              {kills} KILLS · {deaths} DEATHS
            </div>
          </div>

          {/* Kill feed */}
          {killFeed.length > 0 && (
            <div className="kill-feed">
              {killFeed.slice(0, 5).map(item => (
                <div key={item.id} className={`kill-feed-item ${item.isYou ? 'is-you' : ''}`}>
                  <span className="killer">{item.killerName}</span>
                  <span className="icon">✕</span>
                  <span className="victim">{item.victimName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom bar */}
          <div className="hud-bottom">
            {/* Health */}
            <div className="hud-health">
              <div className="health-value" style={{ color: getHealthColor(health) }}>
                {health}
              </div>
              <div className="health-bar-container">
                <div
                  className="health-bar-fill"
                  style={{
                    width: `${health}%`,
                    backgroundColor: getHealthColor(health),
                  }}
                />
              </div>
              <div className="health-label">Health</div>
            </div>

            {/* Ammo */}
            <div className="hud-ammo">
              <div className="ammo-value">
                <span style={{ color: ammo === 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                  {ammo}
                </span>
                <span style={{ fontSize: 16, color: 'var(--text-muted)' }}> / {maxAmmo}</span>
              </div>
              <div className="ammo-label">Ammo</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
