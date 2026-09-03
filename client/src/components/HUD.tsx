import React, { useEffect, useRef, useState } from 'react';
import type { WeaponType } from '../weapons/Weapon';

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
  weaponType?: WeaponType;
  onClickToPlay: () => void;
}

const WEAPON_LABELS: Record<WeaponType, string> = {
  assault: 'Assault Rifle',
  shotgun: 'Shotgun',
  sniper:  'Sniper Rifle',
};

const WEAPON_ICONS: Record<WeaponType, string> = {
  assault: '🔫',
  shotgun: '💥',
  sniper:  '🎯',
};

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
  weaponType = 'assault',
  onClickToPlay,
}) => {
  const [showHitMarker, setShowHitMarker] = useState(false);
  const [showDamageVignette, setShowDamageVignette] = useState(false);
  const [crosshairHit, setCrosshairHit] = useState(false);
  const hitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dmgTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose flash methods globally for game engine to call
  useEffect(() => {
    (window as any).__hudShowHit = () => {
      setShowHitMarker(true);
      setCrosshairHit(true);
      if (hitTimeout.current) clearTimeout(hitTimeout.current);
      hitTimeout.current = setTimeout(() => {
        setShowHitMarker(false);
        setCrosshairHit(false);
      }, 300);
    };
    (window as any).__hudShowDamage = () => {
      setShowDamageVignette(true);
      if (dmgTimeout.current) clearTimeout(dmgTimeout.current);
      dmgTimeout.current = setTimeout(() => setShowDamageVignette(false), 400);
    };
    return () => {
      delete (window as any).__hudShowHit;
      delete (window as any).__hudShowDamage;
    };
  }, []);

  const isLowTime = timeRemaining <= 30;
  const isLowAmmo = ammo <= Math.ceil(maxAmmo * 0.25);
  const isLowHealth = health <= 30;

  return (
    <div className="hud">
      {/* Click to play overlay */}
      {!isPointerLocked && (
        <div className="click-to-play" onClick={onClickToPlay}>
          <div className="pulse-ring" />
          <h2>CLICK TO PLAY</h2>
          <p>Your cursor will be captured · Press ESC to release</p>
          <div style={{
            marginTop: 16,
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'monospace',
            lineHeight: '1.8',
          }}>
            WASD — Move &nbsp;|&nbsp; Shift — Sprint &nbsp;|&nbsp; Mouse — Aim<br />
            LMB — Shoot &nbsp;|&nbsp; R — Reload &nbsp;|&nbsp; 1/2/3 — Switch Weapon<br />
            Tab — Scoreboard
          </div>
        </div>
      )}

      {/* Damage vignette */}
      {showDamageVignette && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.45) 100%)',
          animation: 'none',
        }} />
      )}

      {/* Low health vignette */}
      {isLowHealth && isPointerLocked && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(255,0,0,0.20) 100%)',
        }} />
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
          {/* ── Crosshair ────────────────────────────────── */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <line x1="14" y1="2"  x2="14" y2="9"  stroke={crosshairHit ? '#ff3b3b' : 'white'} strokeWidth="1.5" opacity="0.9" />
              <line x1="14" y1="19" x2="14" y2="26" stroke={crosshairHit ? '#ff3b3b' : 'white'} strokeWidth="1.5" opacity="0.9" />
              <line x1="2"  y1="14" x2="9"  y2="14" stroke={crosshairHit ? '#ff3b3b' : 'white'} strokeWidth="1.5" opacity="0.9" />
              <line x1="19" y1="14" x2="26" y2="14" stroke={crosshairHit ? '#ff3b3b' : 'white'} strokeWidth="1.5" opacity="0.9" />
              <circle cx="14" cy="14" r="1.5" fill={crosshairHit ? '#ff3b3b' : 'white'} opacity="0.95" />
            </svg>
          </div>

          {/* Hit marker (X) */}
          {showHitMarker && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28">
                <line x1="4" y1="4" x2="24" y2="24" stroke="#ff3b3b" strokeWidth="2.5" />
                <line x1="24" y1="4" x2="4" y2="24" stroke="#ff3b3b" strokeWidth="2.5" />
              </svg>
            </div>
          )}

          {/* ── Top bar ────────────────────────────────────── */}
          <div className="hud-top">
            <div className={`hud-timer ${isLowTime ? 'danger' : ''}`}>
              ⏱ {formatTime(timeRemaining)}
            </div>
            <div className="hud-score">
              {kills} <span style={{ opacity: 0.5, fontSize: 12 }}>K</span>
              &nbsp;/&nbsp;
              {deaths} <span style={{ opacity: 0.5, fontSize: 12 }}>D</span>
            </div>
          </div>

          {/* ── Kill feed ──────────────────────────────────── */}
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

          {/* ── Bottom bar ─────────────────────────────────── */}
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
                    backgroundColor: '#ff2d55',
                    transition: 'width 0.2s, background-color 0.3s',
                  }}
                />
              </div>
              <div className="health-label">HP</div>
            </div>

            {/* Weapon selector — center bottom */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}>
              {/* Weapon name */}
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textShadow: '0 0 8px rgba(0,0,0,0.8)',
                marginBottom: 4,
              }}>
                {WEAPON_ICONS[weaponType]} {WEAPON_LABELS[weaponType]}
              </div>
              {/* Slot indicators */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(['assault', 'shotgun', 'sniper'] as WeaponType[]).map((wt, i) => (
                  <div key={wt} style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    border: weaponType === wt
                      ? '2px solid var(--accent-primary)'
                      : '2px solid rgba(255,255,255,0.2)',
                    background: weaponType === wt
                      ? 'rgba(255,100,0,0.25)'
                      : 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    backdropFilter: 'blur(4px)',
                  }}>
                    <span style={{ fontSize: 14 }}>{WEAPON_ICONS[wt]}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>[{i + 1}]</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ammo */}
            <div className="hud-ammo">
              <div className="ammo-value">
                <span style={{ color: isLowAmmo ? '#ff2d55' : 'var(--text-primary)', transition: 'color 0.3s' }}>
                  {ammo}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}> / {maxAmmo}</span>
              </div>
              {isLowAmmo && ammo > 0 && (
                <div style={{ fontSize: 10, color: '#ff2d55', fontFamily: 'monospace', textAlign: 'center' }}>
                  LOW AMMO [R]
                </div>
              )}
              {ammo === 0 && (
                <div style={{ fontSize: 11, color: '#ff2d55', fontFamily: 'monospace', textAlign: 'center', fontWeight: 700 }}>
                  RELOAD [R]
                </div>
              )}
              <div className="ammo-label">Ammo</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
