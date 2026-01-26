import React from 'react';
import { Html } from '@react-three/drei';
import ControlPanel from './ControlPanel';
import { SimulationParams } from '../types';

interface SpatialUIProps {
  params: SimulationParams;
  onChange: (newParams: Partial<SimulationParams>) => void;
  onPreset: (presetName: string) => void;
}

const SpatialUI: React.FC<SpatialUIProps> = (props) => {
  return (
    <mesh position={[0, 1, -1.5]} rotation={[-0.2, 0, 0]}>
      {/* Invisible plane to anchor the HTML */}
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial visible={false} />
      
      <Html 
        transform 
        occlude 
        distanceFactor={1.2} 
        position={[0, 0, 0]}
        style={{
            width: '380px',
            height: '600px',
            // The HTML content needs to catch events in 3D space
            pointerEvents: 'auto' 
        }}
      >
        {/* We reuse the existing ControlPanel but remove absolute positioning via inline style override */}
        <div className="w-full h-full overflow-y-auto bg-black/80 rounded-2xl border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
             {/* Reset absolute positioning from the original component */}
             <div style={{ position: 'relative', top: 0, left: 0, width: '100%', maxWidth: 'none' }}>
                <ControlPanel {...props} />
             </div>
        </div>
      </Html>
    </mesh>
  );
};

export default SpatialUI;