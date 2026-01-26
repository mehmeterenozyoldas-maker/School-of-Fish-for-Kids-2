import React, { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { SimulationParams, AnimationMode } from '../types';
import { buildFishGeometry } from './geometry';
import { evalPosition } from './mathUtils';
import { createFishMaterial } from './FishMaterial';

interface FishSchoolProps {
  params: SimulationParams;
}

// --- Ripple Shader Material ---
const RIPPLE_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RIPPLE_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center);
    float wave1 = sin(dist * 50.0 - uTime * 5.0);
    wave1 = smoothstep(0.9, 0.95, wave1);
    float wave2 = sin(dist * 20.0 - uTime * 3.0);
    float sparkle = sin(dist * 80.0 + uTime * 8.0) * 0.5 + 0.5;
    float mask = 1.0 - smoothstep(0.0, 0.5, dist);
    float combined = (wave1 * 0.6 + wave2 * 0.2 + sparkle * 0.1) * mask;
    float pulse = 0.6 + 0.2 * sin(uTime * 2.0);
    vec3 finalColor = mix(uColor, vec3(1.0), wave1 * 0.6);
    gl_FragColor = vec4(finalColor, combined * pulse * 0.6); 
  }
`;

// Helper for Boids spatial hashing
class SpatialGrid {
    grid: Map<string, number[]> = new Map();
    cellSize: number;

    constructor(cellSize: number) {
        this.cellSize = cellSize;
    }

    clear() {
        this.grid.clear();
    }

    key(p: THREE.Vector3) {
        const x = Math.floor(p.x / this.cellSize);
        const y = Math.floor(p.y / this.cellSize);
        const z = Math.floor(p.z / this.cellSize);
        return `${x},${y},${z}`;
    }

    add(p: THREE.Vector3, index: number) {
        const k = this.key(p);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k)!.push(index);
    }

    // Get indices from local 3x3x3 cells
    query(p: THREE.Vector3, indices: number[]) {
        const cx = Math.floor(p.x / this.cellSize);
        const cy = Math.floor(p.y / this.cellSize);
        const cz = Math.floor(p.z / this.cellSize);
        
        for(let x = cx - 1; x <= cx + 1; x++) {
            for(let y = cy - 1; y <= cy + 1; y++) {
                for(let z = cz - 1; z <= cz + 1; z++) {
                    const k = `${x},${y},${z}`;
                    const cell = this.grid.get(k);
                    if (cell) {
                        for(let i = 0; i < cell.length; i++) indices.push(cell[i]);
                    }
                }
            }
        }
    }
}

const FishSchool: React.FC<FishSchoolProps> = ({ params }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const rippleMatRef = useRef<THREE.ShaderMaterial>(null);
  const handVisualRef = useRef<THREE.Mesh>(null);
  
  const { raycaster, pointer, camera } = useThree();
  const { isPresent, controllers } = useXR();

  // Geometry & Materials
  const geometry = useMemo(() => buildFishGeometry(params.geometry), [params.geometry]);
  const material = useMemo(() => createFishMaterial(params), [params.palette]);

  // Static Attributes
  const { basePositions, phases, hues } = useMemo(() => {
    const count = params.density;
    const basePos = new Array(count);
    const ph = new Float32Array(count);
    const hu = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const px = Math.random() * 40 - 20;
      const py = Math.random() * 10 + 1.5;
      const pz = Math.random() * 40 - 20;
      basePos[i] = new THREE.Vector3(px, py, pz);
      ph[i] = Math.random() * Math.PI * 2.0;
      hu[i] = Math.random();
    }
    return { basePositions: basePos, phases: ph, hues: hu };
  }, [params.density]); 

  // --- BOIDS STATE ---
  // We need persistent state for flocking
  const boidsPos = useRef<Float32Array>(new Float32Array(0));
  const boidsVel = useRef<Float32Array>(new Float32Array(0));
  const spatialGrid = useMemo(() => new SpatialGrid(4.0), []); // 4.0 cell size
  
  // Initialize Boids arrays when density changes
  useLayoutEffect(() => {
      const count = params.density;
      boidsPos.current = new Float32Array(count * 3);
      boidsVel.current = new Float32Array(count * 3);
      
      for(let i=0; i<count; i++) {
          // Random scatter within a sphere
          const r = 10 * Math.cbrt(Math.random());
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          
          boidsPos.current[i*3] = r * Math.sin(phi) * Math.cos(theta);
          boidsPos.current[i*3+1] = r * Math.sin(phi) * Math.sin(theta) + 5; // Lift up
          boidsPos.current[i*3+2] = r * Math.cos(phi);

          // Random velocity
          boidsVel.current[i*3] = (Math.random() - 0.5) * 0.1;
          boidsVel.current[i*3+1] = (Math.random() - 0.5) * 0.1;
          boidsVel.current[i*3+2] = (Math.random() - 0.5) * 0.1;
      }
  }, [params.density]);


  // Setup Standard Attributes
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const newBands = new Float32Array(params.density);
    for(let i = 0; i < params.density; i++) {
      newBands[i] = (i % Math.max(1, params.bands)) / Math.max(1, params.bands - 1);
    }
    meshRef.current.geometry.setAttribute('instanceBand', new THREE.InstancedBufferAttribute(newBands, 1));
    meshRef.current.geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases, 1));
    meshRef.current.geometry.setAttribute('instanceHue', new THREE.InstancedBufferAttribute(hues, 1));
    
    // Explicitly update attributes if geometry changed
    meshRef.current.geometry.attributes.instanceBand.needsUpdate = true;
  }, [params.bands, params.density, phases, hues, geometry]);

  // Determine ripple color based on palette
  const rippleColor = useMemo(() => {
      const c = new THREE.Color('#44eeff');
      switch(params.palette) {
          case 'neon': c.set('#ff2a9d'); break;
          case 'sunset': c.set('#ffaa00'); break;
          case 'cyber': c.set('#00ff00'); break;
          case 'cherry': c.set('#ff0044'); break;
          case 'spectral': c.set('#ffffff'); break;
          case 'plasma': c.set('#cc00ff'); break;
          case 'golden': c.set('#ffcc00'); break;
          case 'frozen': c.set('#aaccff'); break;
          default: c.set('#44eeff'); break;
      }
      return c;
  }, [params.palette]);

  // Update Uniforms
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat.userData.shader) {
        const u = mat.userData.shader.uniforms;
        u.uTailAmp.value = params.tailAmp;
        u.uTailFreq.value = params.tailFreq;
        u.uBands.value = Math.max(1, params.bands);
        u.uJitter.value = params.jitter;
        u.uSpeed.value = params.speed;
        let pIdx = 0;
        if(params.palette === 'neon') pIdx=1;
        else if(params.palette === 'sunset') pIdx=2;
        else if(params.palette === 'cyber') pIdx=3;
        else if(params.palette === 'cherry') pIdx=4;
        else if(params.palette === 'spectral') pIdx=5;
        else if(params.palette === 'plasma') pIdx=6;
        else if(params.palette === 'golden') pIdx=7;
        else if(params.palette === 'frozen') pIdx=8;
        u.uPalette.value = pIdx;
      }
    }
    if (rippleMatRef.current) {
         rippleMatRef.current.uniforms.uColor.value = rippleColor;
    }
  }, [params.tailAmp, params.tailFreq, params.bands, params.jitter, params.palette, params.speed, rippleColor]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempVec3 = useMemo(() => new THREE.Vector3(), []);
  const tempDir = useMemo(() => new THREE.Vector3(), []);
  const interactionPlane = useMemo(() => new THREE.Plane(), []);
  const planeNormal = useMemo(() => new THREE.Vector3(), []);
  const interactionTarget = useRef(new THREE.Vector3(0, -100, 0));

  // --- Animation Loop ---
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // Update Shader Time
    if (rippleMatRef.current) rippleMatRef.current.uniforms.uTime.value = t;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat.userData.shader) mat.userData.shader.uniforms.uTime.value = t * params.speed;

    // --- Interaction Logic ---
    let hasInteraction = false;
    let targetPos = new THREE.Vector3();

    if (isPresent) {
        // VR Logic
        const inputSource = controllers.find(c => c.inputSource.handedness === 'right') || controllers[0];
        if (inputSource && inputSource.controller) {
            targetPos.copy(inputSource.controller.position);
            hasInteraction = true;
             if (handVisualRef.current) {
                handVisualRef.current.visible = true;
                handVisualRef.current.position.copy(targetPos);
            }
        } else if (handVisualRef.current) handVisualRef.current.visible = false;
    } else {
        // Desktop Logic
        if (handVisualRef.current) handVisualRef.current.visible = false;
        raycaster.setFromCamera(pointer, camera);
        camera.getWorldDirection(planeNormal);
        interactionPlane.setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(0,0,0));
        if (raycaster.ray.intersectPlane(interactionPlane, targetPos)) hasInteraction = true;
    }

    if (hasInteraction) {
        interactionTarget.current.lerp(targetPos, 0.15);
        if (mat.userData.shader) {
             const currentMouse = mat.userData.shader.uniforms.uMouse.value as THREE.Vector3;
             currentMouse.copy(interactionTarget.current);
        }
        if (rippleRef.current) {
             rippleRef.current.position.copy(interactionTarget.current);
             rippleRef.current.lookAt(camera.position);
        }
    }

    // --- MOVEMENT LOGIC ---
    const count = params.density;

    if (params.mode === AnimationMode.FLOCK) {
        // --- BOIDS IMPLEMENTATION ---
        
        // 1. Build Spatial Grid
        spatialGrid.clear();
        for(let i=0; i<count; i++) {
             tempVec3.set(boidsPos.current[i*3], boidsPos.current[i*3+1], boidsPos.current[i*3+2]);
             spatialGrid.add(tempVec3, i);
        }

        const neighbors: number[] = [];
        const sep = new THREE.Vector3();
        const ali = new THREE.Vector3();
        const coh = new THREE.Vector3();
        const p = new THREE.Vector3();
        const v = new THREE.Vector3();
        
        // Params
        const perception = 4.0;
        const maxSpeed = 0.15 * params.speed;
        const maxForce = 0.005 * params.speed;

        for (let i = 0; i < count; i++) {
            p.set(boidsPos.current[i*3], boidsPos.current[i*3+1], boidsPos.current[i*3+2]);
            v.set(boidsVel.current[i*3], boidsVel.current[i*3+1], boidsVel.current[i*3+2]);

            neighbors.length = 0;
            spatialGrid.query(p, neighbors);

            sep.set(0,0,0);
            ali.set(0,0,0);
            coh.set(0,0,0);
            let total = 0;

            for (let j of neighbors) {
                if (i === j) continue;
                // Since grid is rough, verify distance
                const dx = boidsPos.current[j*3] - p.x;
                const dy = boidsPos.current[j*3+1] - p.y;
                const dz = boidsPos.current[j*3+2] - p.z;
                const dSq = dx*dx + dy*dy + dz*dz;
                
                if (dSq < perception * perception && dSq > 0.001) {
                    const d = Math.sqrt(dSq);
                    
                    // Separation
                    tempDir.set(-dx, -dy, -dz).normalize().divideScalar(d);
                    sep.add(tempDir);

                    // Alignment
                    tempDir.set(boidsVel.current[j*3], boidsVel.current[j*3+1], boidsVel.current[j*3+2]);
                    ali.add(tempDir);

                    // Cohesion
                    tempDir.set(boidsPos.current[j*3], boidsPos.current[j*3+1], boidsPos.current[j*3+2]);
                    coh.add(tempDir);
                    
                    total++;
                }
            }

            if (total > 0) {
                sep.divideScalar(total).setLength(maxSpeed).sub(v).clampLength(0, maxForce);
                ali.divideScalar(total).setLength(maxSpeed).sub(v).clampLength(0, maxForce);
                coh.divideScalar(total).sub(p).setLength(maxSpeed).sub(v).clampLength(0, maxForce);
            }

            // Center Attraction (Keep them in frame)
            const centerForce = p.clone().negate().multiplyScalar(0.0001); 

            // Mouse Avoidance (Predator)
            let avoidForce = new THREE.Vector3();
            if (hasInteraction) {
                 const distToMouse = p.distanceTo(interactionTarget.current);
                 if (distToMouse < 12.0) {
                     avoidForce.subVectors(p, interactionTarget.current).normalize().multiplyScalar(0.02);
                 }
            }

            // Apply
            v.add(sep.multiplyScalar(1.5));
            v.add(ali.multiplyScalar(1.0));
            v.add(coh.multiplyScalar(1.0));
            v.add(centerForce);
            v.add(avoidForce);
            
            // Limit Speed
            v.clampLength(maxSpeed * 0.5, maxSpeed); // Min speed keeps them moving

            // Update State
            boidsVel.current[i*3] = v.x;
            boidsVel.current[i*3+1] = v.y;
            boidsVel.current[i*3+2] = v.z;

            p.add(v);
            boidsPos.current[i*3] = p.x;
            boidsPos.current[i*3+1] = p.y;
            boidsPos.current[i*3+2] = p.z;

            // Update Instance
            dummy.position.copy(p);
            // Look ahead
            dummy.lookAt(p.clone().add(v));
            dummy.rotateY(Math.PI); // Adjust model orientation
            dummy.scale.setScalar(params.fishScale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

    } else {
        // --- DETERMINISTIC MODES (Existing) ---
        const dt = 0.1;
        for (let i = 0; i < count; i++) {
            const p = evalPosition(i, t, basePositions[i], params.mode, { speed: params.speed, vertical: params.vertical, density: count });
            // Calculate direction by sampling slightly ahead
            const f = evalPosition(i, t + dt, basePositions[i], params.mode, { speed: params.speed, vertical: params.vertical, density: count });
            
            const dir = tempDir.subVectors(f, p);
            if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
            dir.normalize();

            dummy.position.copy(p);
            dummy.lookAt(p.clone().add(dir));
            dummy.rotateY(Math.PI); 
            
            // Banking
            const upV = new THREE.Vector3(0,1,0); // Simple Up
            const side = tempVec3.crossVectors(dir, upV).length();
            dummy.rotateZ((Math.random() * 0.04 - 0.02) + side * 0.1);

            dummy.scale.setScalar(params.fishScale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, params.density]}
        castShadow={false}
        receiveShadow={false}
        frustumCulled={false}
      />
      
      {/* Ripple Mesh */}
      <mesh ref={rippleRef} renderOrder={10}>
        <planeGeometry args={[12, 12]} />
        <shaderMaterial
            ref={rippleMatRef}
            vertexShader={RIPPLE_VERTEX}
            fragmentShader={RIPPLE_FRAGMENT}
            uniforms={{
                uTime: { value: 0 },
                uColor: { value: rippleColor },
            }}
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
        />
      </mesh>

      {/* VR Hand Visualizer */}
      <mesh ref={handVisualRef} visible={false}>
         <sphereGeometry args={[0.2, 16, 16]} />
         <meshBasicMaterial color={rippleColor} transparent opacity={0.5} />
         <pointLight color={rippleColor} intensity={2} distance={5} />
      </mesh>
    </>
  );
};

export default FishSchool;