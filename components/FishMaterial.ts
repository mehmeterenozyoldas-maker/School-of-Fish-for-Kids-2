import * as THREE from 'three';
import { PaletteType } from '../types';

export function createFishMaterial(params: {
  tailAmp: number;
  tailFreq: number;
  bands: number;
  jitter: number;
  palette: PaletteType;
}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.8, // Increased for liquid metal look
    roughness: 0.15, // Smoother for sharp highlights on the new geometry curves
    emissive: 0x000000,
    emissiveIntensity: 0.2, // Base intensity
    vertexColors: true, // Enable Vertex Colors for Voxel AO
  });

  const getPaletteIndex = (p: PaletteType) => {
      switch(p) {
          case 'neon': return 1;
          case 'sunset': return 2;
          case 'cyber': return 3;
          case 'cherry': return 4;
          case 'spectral': return 5;
          case 'plasma': return 6;
          case 'golden': return 7;
          case 'frozen': return 8;
          default: return 0; // natural
      }
  };

  mat.onBeforeCompile = (shader) => {
    // 1. Inject Uniforms
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uTailAmp = { value: params.tailAmp };
    shader.uniforms.uTailFreq = { value: params.tailFreq };
    shader.uniforms.uBands = { value: Math.max(1, params.bands) };
    shader.uniforms.uJitter = { value: params.jitter };
    shader.uniforms.uPalette = { value: getPaletteIndex(params.palette) };
    shader.uniforms.uMouse = { value: new THREE.Vector3(0, -100, 0) }; // Default off-screen
    shader.uniforms.uSpeed = { value: 1.0 }; // Simulation speed factor

    // 2. Inject Vertex Shader Global Variables
    const vsGlobal = `
      attribute float instancePhase;
      attribute float instanceHue;
      attribute float instanceBand;
      varying float vHue;
      varying float vBand;
      varying float vProximity;
      uniform float uTime;
      uniform float uTailAmp;
      uniform float uTailFreq;
      uniform vec3 uMouse;
    `;
    shader.vertexShader = vsGlobal + shader.vertexShader;

    // 3. Inject Vertex Logic (Tail Sway + Mouse Interaction)
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       
       // --- Tail Sway ---
       // Tail wag weighted toward negative Z (the tail)
       // Geometry ranges from roughly -2.8 to +2.8
       float tail = clamp((-transformed.z - 0.2) / 2.5, 0.0, 1.0);
       tail = tail * tail; // Quadratic easing for organic feel
       
       float sway = sin(uTime * uTailFreq + instancePhase) * uTailAmp * tail;
       transformed.x += sway;
       
       // --- Mouse Interaction (Push & Pull) ---
       // We calculate force based on the INSTANCE position (world space center)
       vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
       
       float dist = distance(instancePos, uMouse);
       
       // Pass Proximity to Fragment (0.0 = far, 1.0 = close)
       // Range roughly 0 to 30
       vProximity = 1.0 - clamp(dist / 30.0, 0.0, 1.0);
       
       // Zones
       float rPush = 10.0; // Close range: Repel
       float rPull = 30.0; // Mid range: Attract
       
       vec3 worldOffset = vec3(0.0);
       
       if (dist < rPush) {
         // --- PUSH (Repulsion) ---
         vec3 dir = normalize(instancePos - uMouse);
         float f = (rPush - dist) / rPush; 
         f = f * f; // Quadratic ramp up
         worldOffset = dir * f * 12.0;
         
       } else if (dist < rPull) {
         // --- PULL (Attraction) ---
         // We want to gently pull them in if they are wandering nearby
         vec3 dir = normalize(uMouse - instancePos);
         
         // Normalize distance within the pull band (0.0 at rPush, 1.0 at rPull)
         float range = rPull - rPush;
         float normDist = (dist - rPush) / range;
         
         // Use a sine hump to fade attraction in and out smoothly
         // Starts at 0, peaks in middle, ends at 0
         float f = sin(normDist * 3.14159);
         
         worldOffset = dir * f * 5.0; 
       }

       // Transform World Offset to Local Space
       // Vector * Matrix = multiply by Transpose (Inverse Rotation)
       vec3 localOffset = worldOffset * mat3(instanceMatrix);
       
       transformed += localOffset;

       vHue = instanceHue;
       vBand = instanceBand;
      `
    );

    // 4. Inject Fragment Shader Global Variables & Functions
    const fsGlobal = `
      varying float vHue;
      varying float vBand;
      varying float vProximity;
      uniform float uBands;
      uniform float uJitter;
      uniform float uTime;
      uniform float uSpeed;
      uniform int uPalette;

      vec3 hsv2rgb(vec3 c){
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      vec3 paletteColor(int idx, float t){
        if(idx==0){ // natural blues
          return mix(vec3(0.1,0.4,0.9), vec3(0.0,1.0,0.8), t); 
        } else if(idx==1){ // neon
          return mix(vec3(0.1,0.9,1.0), vec3(1.0,0.1,0.8), t); 
        } else if(idx==2){ // sunset
          return mix(vec3(1.0,0.3,0.1), vec3(0.6,0.0,0.5), t); 
        } else if(idx==3){ // cyber (green/yellow)
          return mix(vec3(0.0, 0.3, 0.0), vec3(0.4, 1.0, 0.1), t);
        } else if(idx==4){ // cherry (red/pink/white)
          return mix(vec3(0.8, 0.0, 0.2), vec3(1.0, 0.8, 0.9), t);
        } else if(idx==5){ // spectral (rainbow)
          vec3 hsv = vec3(t, 0.8, 1.0);
          return hsv2rgb(hsv);
        } else if(idx==6){ // plasma (purple/cyan/electric)
          return mix(vec3(0.5, 0.0, 1.0), vec3(0.0, 1.0, 1.0), t);
        } else if(idx==7){ // golden (amber/gold)
          return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.9, 0.4), t);
        } else { // frozen (deep blue/white)
          return mix(vec3(0.0, 0.2, 0.6), vec3(0.8, 0.95, 1.0), t);
        }
      }
    `;
    shader.fragmentShader = fsGlobal + shader.fragmentShader;

    // 5. Inject Fragment Logic (Color Mixing + Emissive Glow)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       // Per-instance palette mix: banded groups + jittered hue shift
       float bandIdx = floor(vBand * uBands + 1e-5);
       float t = (uBands <= 1.0) ? 0.5 : bandIdx / max(1.0, uBands - 1.0);
       
       vec3 paletteCol = paletteColor(uPalette, t);
       
       // Add some iridescent jitter
       float hShift = (vHue - 0.5) * 0.5 * uJitter; 
       
       // Interaction Shift: If close to mouse, shift hue slightly
       hShift += vProximity * 0.2;
       
       vec3 jitterCol = hsv2rgb(vec3(fract(0.6 + hShift), 0.8, 1.0));
       
       vec3 finalCol = mix(paletteCol, jitterCol, uJitter);
       
       // Multiply by vertex color (AO from Voxel) if available
       #ifdef USE_COLOR
         finalCol *= vColor.rgb;
       #endif

       diffuseColor.rgb = finalCol;
       
       // --- Dynamic Emissive ---
       // Pulse based on Time and Speed
       // Faster speed = faster pulse
       float pulseFreq = 2.0 * uSpeed;
       float pulse = 1.0 + 0.3 * sin(uTime * pulseFreq + vHue * 10.0);
       
       // Proximity Boost: Glow brighter when near interaction
       float proximityGlow = 1.0 + vProximity * 2.0;
       
       // Standard multiplier for r150 lighting
       totalEmissiveRadiance = finalCol * 1.5 * pulse * proximityGlow; 
      `
    );

    mat.userData.shader = shader;
  };

  return mat;
}