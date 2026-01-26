import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, Scanline } from '@react-three/postprocessing';
import { XR, VRButton, Controllers, Hands } from '@react-three/xr';
import { useXR } from '@react-three/xr';
import FishSchool from './components/FishSchool';
import ControlPanel from './components/ControlPanel';
import SpatialUI from './components/SpatialUI';
import AnaglyphRenderer from './components/AnaglyphRenderer';
import { DEFAULT_PARAMS, PRESETS } from './constants';
import { SimulationParams, AnimationMode } from './types';
import * as THREE from 'three';

// Separate component to handle Logic inside Canvas that needs useXR
const SceneContent: React.FC<{
    params: SimulationParams,
    handleParamChange: (p: Partial<SimulationParams>) => void,
    handlePreset: (n: string) => void
}> = ({ params, handleParamChange, handlePreset }) => {
    const { isPresent } = useXR();

    return (
        <>
            <color attach="background" args={['#05070a']} />
            <fog attach="fog" args={['#05070a', 10, 60]} />
            
            {/* Ambient Environment */}
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            
            {/* Marine Snow / Drifting Particulates */}
            <Sparkles 
                count={150}
                scale={25}
                size={4}
                speed={0.4}
                opacity={0.2}
                noise={0.2}
                color="#ccf0ff" 
            />
            
            {/* Lighting */}
            <ambientLight intensity={0.2} color="#001133" />
            <spotLight position={[10, 20, 10]} intensity={2} penumbra={1} color="#ccf0ff" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#0044ff" />

            {/* XR Inputs */}
            <Controllers />
            <Hands />

            {/* Main Simulation */}
            <Suspense fallback={null}>
                <FishSchool params={params} />
            </Suspense>

            {/* Spatial UI (Only visible in VR) */}
            {isPresent && (
                <SpatialUI 
                    params={params} 
                    onChange={handleParamChange} 
                    onPreset={handlePreset} 
                />
            )}

            {/* 
                RENDER PIPELINE 
                1. Stereo Mode (Red/Cyan Glasses) - Desktop Only
                2. XR Mode (Headset) - No PostProcessing (Performance)
                3. Desktop Standard - Full PostProcessing
            */}
            {params.stereo && !isPresent ? (
                <AnaglyphRenderer />
            ) : (
                !isPresent && (
                    <EffectComposer disableNormalPass>
                        <Bloom 
                            luminanceThreshold={0.2} 
                            mipmapBlur 
                            intensity={1.2} 
                            radius={0.5} 
                        />
                        <Noise opacity={0.02} />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />

                        {params.hologram && (
                            <>
                                <ChromaticAberration 
                                    offset={new THREE.Vector2(0.005, 0.005)} 
                                    radialModulation={false} 
                                    modulationOffset={0} 
                                />
                                <Scanline 
                                    density={1.25} 
                                    scrollSpeed={0.02} 
                                    opacity={0.2} 
                                />
                            </>
                        )}
                    </EffectComposer>
                )
            )}

            {/* Camera Controls - Only for Desktop */}
            {!isPresent && (
                <OrbitControls 
                    target={[0, 1, 0]} 
                    enablePan={false} 
                    enableDamping 
                    dampingFactor={0.05}
                    autoRotate={false}
                    rotateSpeed={0.5}
                />
            )}
        </>
    );
};

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);

  // Handle params update
  const handleParamChange = (newParams: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  // Handle Presets
  const handlePreset = (name: string) => {
    const p = PRESETS[name];
    if (p) {
      handleParamChange(p);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '9') {
        handleParamChange({ mode: parseInt(k, 10) as AnimationMode });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
        {/* Enter VR Button (Overlay) */}
        <VRButton className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/10 hover:bg-sky-500 text-white font-bold py-2 px-6 rounded-full backdrop-blur-md border border-white/20 transition-all" />

        <div className="relative w-full h-screen bg-black overflow-hidden select-none">
        
        {/* Desktop UI Overlay */}
        <ControlPanel 
            params={params} 
            onChange={handleParamChange} 
            onPreset={handlePreset} 
        />

        <Canvas
            camera={{ position: [0, 6, 22], fov: 55 }}
            dpr={[1, 1.5]} 
            gl={{ 
            antialias: true, 
            stencil: false, 
            depth: true,
            preserveDrawingBuffer: true // Required for reliable canvas recording fallback
            }} 
        >
            <XR>
                <SceneContent 
                    params={params}
                    handleParamChange={handleParamChange}
                    handlePreset={handlePreset}
                />
            </XR>
        </Canvas>
        </div>
    </>
  );
};

export default App;