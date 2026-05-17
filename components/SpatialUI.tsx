import React, { useState } from 'react';
import { Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import { SimulationParams, AnimationMode, ANIMATION_MODE_LABELS, PaletteType } from '../types';
import { PRESETS } from '../constants';

interface SpatialUIProps {
  params: SimulationParams;
  onChange: (newParams: Partial<SimulationParams>) => void;
  onPreset: (presetName: string) => void;
}

const INTER_FONT = "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2";

const Button3D = ({ position, text, onClick, active = false, width = 0.4, height = 0.12 }: any) => {
  const [hover, setHover] = useState(false);
  return (
    <Interactive onSelect={onClick} onHover={() => setHover(true)} onBlur={() => setHover(false)}>
      <group position={position}>
        <mesh>
          <boxGeometry args={[width, height, 0.02]} />
          <meshStandardMaterial 
            color={active ? '#0284c7' : (hover ? '#0ea5e9' : '#1e293b')} 
            roughness={0.4} 
            metalness={0.2} 
          />
        </mesh>
        <Text 
          position={[0, 0, 0.015]} 
          fontSize={0.045} 
          color="white" 
          anchorX="center" 
          anchorY="middle" 
          font={INTER_FONT}
        >
          {text}
        </Text>
      </group>
    </Interactive>
  );
};

const Stepper3D = ({ position, label, value, onPrev, onNext }: any) => (
  <group position={position}>
    <Text position={[0, 0.12, 0]} fontSize={0.04} color="#94a3b8" anchorX="center" font={INTER_FONT}>
      {label}
    </Text>
    <Button3D position={[-0.35, 0, 0]} text="<" onClick={onPrev} width={0.15} />
    <Text position={[0, 0, 0]} fontSize={0.05} color="#bae6fd" anchorX="center" font={INTER_FONT}>
      {value}
    </Text>
    <Button3D position={[0.35, 0, 0]} text=">" onClick={onNext} width={0.15} />
  </group>
);

const SpatialUI: React.FC<SpatialUIProps> = ({ params, onChange, onPreset }) => {
  const presetKeys = Object.keys(PRESETS);
  const modes = Object.keys(ANIMATION_MODE_LABELS).map(Number) as AnimationMode[];
  const palettes: PaletteType[] = ['natural', 'neon', 'sunset', 'cyber', 'cherry', 'spectral', 'plasma', 'golden', 'frozen'];

  const handleModeChange = (dir: 1 | -1) => {
    const idx = modes.indexOf(params.mode);
    const nextIdx = (idx + dir + modes.length) % modes.length;
    onChange({ mode: modes[nextIdx] });
  };

  const handlePaletteChange = (dir: 1 | -1) => {
    const idx = palettes.indexOf(params.palette);
    const nextIdx = (idx + dir + palettes.length) % palettes.length;
    onChange({ palette: palettes[nextIdx] });
  };

  return (
    <group position={[0, 1.2, -1.5]} rotation={[-0.1, 0, 0]}>
      {/* Backplate */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[2.0, 1.2, 0.02]} />
        <meshStandardMaterial color="#020617" transparent opacity={0.85} roughness={0.1} metalness={0.5} />
      </mesh>

      {/* Title */}
      <Text position={[0, 0.45, 0]} fontSize={0.08} color="#38bdf8" anchorX="center" font={INTER_FONT}>
        VR CONTROL PANEL
      </Text>

      {/* Left Column: Presets */}
      <group position={[-0.5, 0.1, 0]}>
        <Text position={[0, 0.2, 0]} fontSize={0.05} color="#94a3b8" anchorX="center" font={INTER_FONT}>
          PRESETS
        </Text>
        {presetKeys.map((key, i) => {
          const x = (i % 2) * 0.45 - 0.225;
          const y = -Math.floor(i / 2) * 0.15;
          return (
            <Button3D 
              key={key} 
              position={[x, y, 0]} 
              text={key.toUpperCase()} 
              onClick={() => onPreset(key)} 
              width={0.4}
            />
          );
        })}
      </group>

      {/* Right Column: Settings */}
      <group position={[0.5, 0.1, 0]}>
        <Stepper3D 
          position={[0, 0.15, 0]} 
          label="KINETIC MODE" 
          value={ANIMATION_MODE_LABELS[params.mode].toUpperCase()} 
          onPrev={() => handleModeChange(-1)} 
          onNext={() => handleModeChange(1)} 
        />
        
        <Stepper3D 
          position={[0, -0.15, 0]} 
          label="PALETTE" 
          value={params.palette.toUpperCase()} 
          onPrev={() => handlePaletteChange(-1)} 
          onNext={() => handlePaletteChange(1)} 
        />

        <group position={[0, -0.45, 0]}>
          <Text position={[0, 0.12, 0]} fontSize={0.04} color="#94a3b8" anchorX="center" font={INTER_FONT}>
            GEOMETRY
          </Text>
          <Button3D 
            position={[-0.22, 0, 0]} 
            text="ORGANIC" 
            active={params.geometry === 'organic'}
            onClick={() => onChange({ geometry: 'organic' })} 
            width={0.4} 
          />
          <Button3D 
            position={[0.22, 0, 0]} 
            text="VOXEL" 
            active={params.geometry === 'voxel'}
            onClick={() => onChange({ geometry: 'voxel' })} 
            width={0.4} 
          />
        </group>
      </group>
    </group>
  );
};

export default SpatialUI;