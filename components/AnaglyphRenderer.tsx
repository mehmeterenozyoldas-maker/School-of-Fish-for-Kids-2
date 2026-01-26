import React, { useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const AnaglyphRenderer: React.FC = () => {
  const { gl, scene, camera } = useThree();

  const _stereo = useMemo(() => {
    const s = new THREE.StereoCamera();
    s.eyeSep = 1.0; // Reduced slightly for better comfort
    // Important: Match focus to the approximate distance of the subject (fish are at 0, cam at 22)
    // This puts the zero-parallax plane at the fish, so they float "in" the screen comfortably.
    // Objects closer than 22 will pop out, objects further will go in.
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        s.focus = (camera as THREE.PerspectiveCamera).position.z; 
    } else {
        s.focus = 22;
    }
    return s;
  }, [camera]);

  useEffect(() => {
    // We take over the render loop clearing mechanism
    const originalAutoClear = gl.autoClear;
    gl.autoClear = false;
    return () => {
      gl.autoClear = originalAutoClear;
      // Ensure mask is reset on unmount
      gl.getContext().colorMask(true, true, true, true);
    };
  }, [gl]);

  useFrame(() => {
    const context = gl.getContext();

    // 1. Prepare Frame
    gl.setRenderTarget(null);
    gl.setScissorTest(false);
    
    // IMPORTANT: Reset mask to ALL TRUE before clearing, otherwise 
    // we might only clear the Red channel from the previous frame!
    context.colorMask(true, true, true, true);
    gl.clear(); // Clear Color, Depth, Stencil

    // 2. Update Camera
    _stereo.update(camera as THREE.PerspectiveCamera);

    // 3. Render Left Eye (Red Channel)
    // Mask: R=True, G=False, B=False, A=True
    context.colorMask(true, false, false, true);
    gl.render(scene, _stereo.cameraL);

    // 4. Render Right Eye (Cyan - Green/Blue Channels)
    // Clear depth so the right eye draws over the left eye's geometry correctly
    gl.clearDepth();
    // Mask: R=False, G=True, B=True, A=True
    context.colorMask(false, true, true, true);
    gl.render(scene, _stereo.cameraR);

    // 5. Reset for safety for next pass or other components
    context.colorMask(true, true, true, true);
  }, 1); // Priority 1 ensures this runs after standard R3F render (which we wipe)

  return null;
};

export default AnaglyphRenderer;