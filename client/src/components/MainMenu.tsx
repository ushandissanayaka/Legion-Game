import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import type { WeaponType } from '../weapons/Weapon';
import './MainMenu.css';

function CharacterModel() {
  const { scene, animations } = useGLTF('/low poly soldier 3d model.glb');
  const { actions } = useAnimations(animations, scene);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (actions) {
      const actionNames = Object.keys(actions);
      // Play 'Idle' animation or the first one available
      const actionToPlay = actions['Idle'] || actions[actionNames[0]];
      if (actionToPlay) {
        actionToPlay.reset().fadeIn(0.5).play();
      }
    }
  }, [actions]);

  // Clockwise rotation (negative Y axis = clockwise when viewed from above)
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y -= delta * 0.6;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={4.5} position={[0, -3.2, 0]} />
    </group>
  );
}


interface MainMenuProps {
  audio: AudioManager;
  onCreateRoom: (name: string, duration: number) => void;
  onJoinRoom: (name: string, roomId: string) => void;
  onAutoJoinRoom?: (name: string, duration: number) => void;
  onStartPractice: (name: string, botCount: number, duration: number, gun: WeaponType) => void;
  isConnecting: boolean;
  error: string | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  audio,
  onCreateRoom,
  onJoinRoom,
  onAutoJoinRoom,
  onStartPractice,
  isConnecting,
  error,
}) => {
  const [playerName, setPlayerName] = useState('Guest' + Math.floor(Math.random() * 1000));
  const [matchDuration, setMatchDuration] = useState(180);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showFriendsMenu, setShowFriendsMenu] = useState(false);
  
  const handleAutoJoin = () => {
    if (!playerName.trim() || isConnecting) return;
    audio.playClick();
    if (onAutoJoinRoom) {
      onAutoJoinRoom(playerName.trim(), matchDuration);
    }
  };

  const handlePractice = () => {
    if (!playerName.trim() || isConnecting) return;
    audio.playClick();
    onStartPractice(playerName.trim(), 5, matchDuration, 'assault');
  };

  const handleCreate = () => {
    if (!playerName.trim() || isConnecting) return;
    audio.playClick();
    onCreateRoom(playerName.trim(), matchDuration);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinRoomId.trim() || isConnecting) return;
    audio.playClick();
    onJoinRoom(playerName.trim(), joinRoomId.trim().toUpperCase());
  };

  return (
    <div className="lobby-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-left"></div>
        <div className="top-center">
          <div className="title-banner">
            <h1>LEGION</h1>
            <span className="season-text">SEASON 1!</span>
          </div>
        </div>
        <div className="top-right">
          <button className="icon-btn">↓</button>
          <button className="icon-btn">🔄</button>
          <button className="free-skins-btn">🖌 FREE SKINS</button>
          <button className="icon-btn">⛶</button>
        </div>
      </div>

      <div className="lobby-body">
        {/* Left Sidebar */}
        <div className="left-sidebar">
          <div className="stats-box">
            <div className="stat-row">
              <span className="stat-icon gem">💎</span>
              <span className="stat-value">0</span>
              <button className="add-btn">+</button>
            </div>
            <div className="stat-row">
              <span className="stat-icon coin">🪙</span>
              <span className="stat-value">0</span>
              <button className="add-btn">+</button>
            </div>
          </div>
          
          <div className="player-profile">
            <div className="nickname-label">Nickname</div>
            <input 
              className="nickname-input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter Name"
            />
          </div>

          <div className="menu-buttons">
            <button className="menu-btn bg-cyan">🚩 Missions</button>
            <button className="menu-btn bg-orange">🎫 Poxel Pass</button>
            <button className="menu-btn bg-green">🏪 Shop</button>
            <button className="menu-btn bg-blue">🎛 Inventory</button>
            <button className="menu-btn bg-purple">🏆 Leaders</button>
            <button className="menu-btn bg-yellow">🛡 Clans</button>
            <button className="menu-btn bg-navy">🏠 Servers</button>
          </div>
        </div>

        {/* Center Content */}
        <div className="center-content">
          <div className="character-display">
            {/* Camera: pulled back further, positioned higher to frame full body */}
            <Canvas camera={{ position: [0, 1.2, 6.5], fov: 40 }}>
              <ambientLight intensity={1.2} />
              <directionalLight position={[5, 10, 5]} intensity={2.5} />
              <directionalLight position={[-5, 5, -5]} intensity={0.8} />
              <React.Suspense fallback={null}>
                <CharacterModel />
              </React.Suspense>
            </Canvas>
          </div>

          <div className="play-actions">
            {error && <div className="error-tooltip">{error}</div>}
            <button 
              className={`btn-play-huge ${isConnecting ? 'loading' : ''}`}
              onClick={handleAutoJoin}
              disabled={isConnecting}
            >
              <div className="play-text">{isConnecting ? 'JOINING...' : 'PLAY'}</div>
              <div className="play-subtext">{isConnecting ? 'Please wait' : 'Multiplayer'}</div>
            </button>
            <button 
              className="btn-practice"
              onClick={handlePractice}
              disabled={isConnecting}
            >
              🔫 PRACTICE MODE
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="right-sidebar">
          {showFriendsMenu ? (
            <div className="friends-menu">
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.4rem', textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '12px' }}>🎮 Play With Friends</h3>
              
              <div style={{ background: '#111', padding: '14px', borderRadius: '10px' }}>
                <label style={{ color: '#aaa', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Match Duration</label>
                <select 
                  style={{ width: '100%', padding: '10px', background: '#222', color: 'white', border: '1px solid #555', borderRadius: '6px', fontSize: '1rem' }}
                  value={matchDuration} 
                  onChange={e => setMatchDuration(Number(e.target.value))}
                >
                  <option value={60}>1 Minute</option>
                  <option value={120}>2 Minutes</option>
                  <option value={180}>3 Minutes</option>
                  <option value={240}>4 Minutes</option>
                  <option value={300}>5 Minutes</option>
                </select>
                <button 
                  style={{ width: '100%', marginTop: '12px', padding: '14px', background: '#4caf50', border: '3px solid #2e7d32', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 4px 0 #1b5e20' }}
                  onClick={handleCreate}
                  disabled={isConnecting || !playerName.trim()}
                >
                  {isConnecting ? '...' : '⚡ Create Room'}
                </button>
              </div>

              <div style={{ background: '#111', padding: '14px', borderRadius: '10px' }}>
                <label style={{ color: '#aaa', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>Join by Room Code</label>
                <input 
                  style={{ width: '100%', padding: '12px', background: '#222', color: 'white', border: '1px solid #555', borderRadius: '6px', marginBottom: '12px', fontSize: '1.1rem', letterSpacing: '3px', textAlign: 'center', boxSizing: 'border-box' }}
                  placeholder="XXXXX"
                  value={joinRoomId}
                  onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                  maxLength={5}
                />
                <button 
                  style={{ width: '100%', padding: '14px', background: '#2196f3', border: '3px solid #1565c0', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 4px 0 #0d47a1' }}
                  onClick={handleJoin}
                  disabled={isConnecting || !playerName.trim() || !joinRoomId.trim()}
                >
                  {isConnecting ? '...' : '→ Join Room'}
                </button>
              </div>

              <button 
                style={{ marginTop: 'auto', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #555', color: '#ccc', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}
                onClick={() => setShowFriendsMenu(false)}
              >
                ✕ Close
              </button>
            </div>
          ) : (
            <div className="ad-banner">
              <div className="ad-title">LEGION AD</div>
              <div className="ad-content">PLAY FOR FREE</div>
            </div>
          )}

          <div className="social-buttons">
            <button className="social-btn" onClick={() => {
              audio.playClick();
              setShowFriendsMenu(prev => !prev);
            }}>
              👥 Join/Create<br/><small>Play With Friends</small>
            </button>
            <div className="small-socials">
              <button className="icon-btn">⚙</button>
              <button className="icon-btn">👾</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
