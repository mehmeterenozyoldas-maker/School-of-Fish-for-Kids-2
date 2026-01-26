import * as THREE from 'three';
import { AnimationMode } from '../types';

// We reuse a Vector3 to avoid garbage collection in the tight loop if possible,
// but for thread safety in some contexts, new vectors are safer. 
// Here, we return a new Vector3 as per the original logic's contract.
export function evalPosition(
  i: number,
  t: number,
  basePos: THREE.Vector3,
  mode: AnimationMode,
  params: { speed: number; vertical: number; density?: number }
): THREE.Vector3 {
  const { speed, vertical, density = 2000 } = params;
  const speedT = t * speed;
  const cx = Math.sin(speedT * 0.20) * 4.0;
  const cz = Math.cos(speedT * 0.25) * 4.0;
  const ti = speedT + i * 0.01;
  
  let x = 0, y = 0, z = 0;

  switch (mode) {
    case AnimationMode.WAVE:
      x = Math.cos(ti * 0.5) * 10 + (i % 20) * 0.3;
      y = Math.sin(ti * 2.0) * 3 + 3;
      z = Math.sin(ti * 0.5) * 10 + Math.floor(i / 20) * 0.3;
      break;

    case AnimationMode.SCHOOL:
      const ang = ti + Math.sin(i * 0.1);
      x = Math.sin(ang) * (10 + Math.sin(speedT * 0.5) * 5);
      y = Math.sin(ang * 2) + Math.cos(i * 0.5) * 2 + 2.5;
      z = Math.cos(ang) * (10 + Math.cos(speedT * 0.5) * 5);
      break;

    case AnimationMode.LISSAJOUS:
      const a = 3, b = 2, c = 4;
      x = Math.sin(a * ti + i) * 8;
      y = Math.cos(b * ti + i * 0.5) * 4 + 1.5;
      z = Math.sin(c * ti + i * 0.3) * 8;
      break;

    case AnimationMode.FLOW_FIELD:
      const fx = Math.sin(basePos.y * 0.15 + speedT * 0.9) + Math.cos(basePos.z * 0.11 - speedT * 0.6);
      const fy = Math.sin(basePos.z * 0.17 + speedT * 0.7) + Math.cos(basePos.x * 0.09 + speedT * 0.8);
      const fz = Math.sin(basePos.x * 0.13 - speedT * 0.5) + Math.cos(basePos.y * 0.07 + speedT * 0.4);
      const amp = 4.0;
      x = basePos.x + fx * amp;
      y = Math.max(0.5, basePos.y + fy * (amp * 0.5) * vertical);
      z = basePos.z + fz * amp;
      break;

    case AnimationMode.TORUS_KNOT:
      const p = 2, q = 3;
      const u = ti * 1.2 + (i * 0.002);
      const R = 7.0, r = 2.5;
      x = (R + r * Math.cos(q * u)) * Math.cos(p * u);
      y = (R + r * Math.cos(q * u)) * Math.sin(p * u) * 0.6 + 1.0;
      z = r * Math.sin(q * u);
      break;

    case AnimationMode.VORTEX_SCHOOL:
      const rad = 6.0 + 3.0 * Math.sin(i * 0.13 + speedT * 0.8);
      const angV = ti * (1.8 + 0.6 * Math.sin(i * 0.21)) + Math.sin(i * 0.37 + speedT * 1.2) * 0.6;
      x = cx + Math.cos(angV) * rad;
      y = 2.0 + Math.sin(angV * 2.3 + i * 0.01) * 2.2 + Math.sin(speedT * 3.0 + i) * 0.2;
      z = cz + Math.sin(angV) * rad;
      break;

    case AnimationMode.MURMURATION:
      const layer = (i % 50) / 50;
      const rMur = 4.0 + 6.0 * layer + Math.sin(i * 0.07 + speedT * 2.0) * (1.0 + layer);
      const theta = ti * (2.5 + layer * 1.5) + Math.sin(i * 0.11) * 0.5;
      const phi = Math.sin(ti * 1.9 + i * 0.031) * (Math.PI * 0.35) + 0.6;
      const burst = Math.sin(speedT * 2.7 + i * 0.017);
      const jitter = 0.8 + Math.abs(burst) * 0.7;
      const rr = rMur * jitter;
      const sx = Math.cos(theta) * Math.cos(phi);
      const sy = Math.sin(phi);
      const sz = Math.sin(theta) * Math.cos(phi);
      x = cx + sx * rr;
      y = 3.0 + sy * rr * (0.9 * vertical);
      z = cz + sz * rr;
      break;

    case AnimationMode.COLUMNS:
      const bands = 5;
      const band = i % bands;
      const baseR = 3.0 + band * 1.3;
      const height = 12.0 + Math.sin(speedT * 1.5 + band) * 5.0;
      const thetaCol = ti * (3.6 + band * 0.4) + Math.sin(i * 0.09) * 0.3;
      const yPulse = Math.sin(speedT * 3.2 + i * 0.05) * 1.1 + (band / (bands - 1)) * height - height * 0.5;
      const rBreath = baseR * (1.0 + 0.35 * Math.sin(speedT * 2.0 + band + i * 0.02));
      x = cx + Math.cos(thetaCol) * rBreath;
      y = yPulse * vertical;
      z = cz + Math.sin(thetaCol) * rBreath;
      break;

    case AnimationMode.SPIRAL:
      // Galaxy Spiral
      const spiralR = (i / density) * 18.0; // Radius increases with index
      const spiralTheta = spiralR * 1.5 - speedT * 1.5; // Angle twists with radius
      // Add randomness to arms
      const armOffset = (i % 3) * (Math.PI * 2 / 3); 
      const finalTheta = spiralTheta + armOffset;
      
      x = cx + Math.cos(finalTheta) * spiralR;
      z = cz + Math.sin(finalTheta) * spiralR;
      // Flattened disk with slight wave
      y = Math.sin(spiralR - speedT * 2.0) * 1.5 * vertical;
      break;

    case AnimationMode.DNA:
      // Double Helix
      const strand = i % 2 === 0 ? 1 : -1; // Two strands
      const helixHeight = 25.0;
      // Distribute vertically
      const helixY = ((i / density) - 0.5) * helixHeight; 
      const helixTheta = speedT * 1.5 + helixY * 0.4;
      
      const helixRad = 4.0 + Math.sin(speedT + helixY) * 1.0;
      
      x = cx + Math.sin(helixTheta) * helixRad * strand;
      y = helixY * vertical;
      z = cz + Math.cos(helixTheta) * helixRad * strand;
      break;

    case AnimationMode.SPHERE:
      // Fibonacci Sphere Distribution
      const phiSphere = Math.acos(1 - 2 * (i + 0.5) / density);
      const thetaSphere = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5) + speedT * 0.5;
      const sphereR = 9.0 + Math.sin(speedT * 2.0 + i * 0.01) * 0.5;
      
      x = cx + sphereR * Math.sin(phiSphere) * Math.cos(thetaSphere);
      y = (sphereR * Math.sin(phiSphere) * Math.sin(thetaSphere)) * vertical;
      z = cz + sphereR * Math.cos(phiSphere);
      break;

    case AnimationMode.ACCRETION:
      // Black Hole Accretion Disk
      // r ranges from 2.0 to 14.0
      const rAcc = 3.0 + (i / density) * 12.0;
      // Velocity follows Keplerian decay: v ~ 1/sqrt(r)
      const vAcc = (10.0 / Math.sqrt(rAcc)) * speedT * 0.5;
      const thetaAcc = i * 0.1 + vAcc;
      
      x = cx + Math.cos(thetaAcc) * rAcc;
      z = cz + Math.sin(thetaAcc) * rAcc;
      
      // Gravity well: Dip in center
      // y = -1/r look
      const yDip = -12.0 / (rAcc * 0.8);
      // Add some turbulence/noise
      const yTurb = Math.sin(thetaAcc * 3.0 + speedT) * 0.5;
      y = (yDip + yTurb) * vertical;
      break;

    case AnimationMode.KLEIN:
      // Figure-8 Klein Bottle Parametric
      // Map index to u, v parameter space
      const uK = (i / density) * Math.PI * 4;
      const vK = ((i % 100) / 100) * Math.PI * 2;
      const aK = 3.5; // Scale
      
      // Classic figure-8 klein bottle formulas
      const cK = Math.cos(uK);
      const sK = Math.sin(uK);
      const rK = 4.0 - 2.0 * Math.cos(uK); // varying radius
      
      if (uK < Math.PI) {
          x = aK * (6 * cK * (1 + sK) + 4 * rK * Math.cos(uK) * Math.cos(vK));
          z = aK * (16 * sK + 4 * rK * Math.sin(uK) * Math.cos(vK));
      } else {
          x = aK * (6 * cK * (1 + sK) - 4 * rK * Math.cos(vK));
          z = aK * (16 * sK);
      }
      y = aK * (4 * rK * Math.sin(vK)) * 0.25 * vertical;
      
      // Center it roughly
      x = x * 0.15 + cx;
      y = y * 0.15;
      z = z * 0.15 + cz;
      break;

    case AnimationMode.SUPERSHAPE:
      // 3D Superformula (Gielis)
      // Dynamic parameters based on time
      const timeS = speedT * 0.5;
      // Morphing parameters
      const m = Math.sin(timeS * 0.2) * 6 + 7; // number of lobes
      const n1 = 0.2 + Math.abs(Math.sin(timeS * 0.3));
      const n2 = 1.7;
      const n3 = 1.7;
      
      const total = density;
      const phiSS = (Math.PI * i) / total;
      const thetaSS = (Math.PI * 2 * i * 30) / total; // Wrap around many times
      
      // Superformula
      const r1 = Math.pow( Math.pow(Math.abs(Math.cos(m * phiSS / 4) / 1), n2) + Math.pow(Math.abs(Math.sin(m * phiSS / 4) / 1), n3), -1 / n1 );
      const r2 = Math.pow( Math.pow(Math.abs(Math.cos(m * thetaSS / 4) / 1), n2) + Math.pow(Math.abs(Math.sin(m * thetaSS / 4) / 1), n3), -1 / n1 );
      
      const scaleS = 8.0;
      x = scaleS * r1 * Math.cos(phiSS) * r2 * Math.cos(thetaSS);
      y = scaleS * r1 * Math.sin(phiSS) * r2 * Math.cos(thetaSS);
      z = scaleS * r2 * Math.sin(thetaSS);
      
      y *= vertical;
      break;

    case AnimationMode.TURBULENCE:
    default:
      const nx = Math.sin((basePos.x + speedT * 4.0) * 0.6) + Math.cos((basePos.y - speedT * 3.1) * 0.7);
      const ny = Math.sin((basePos.y + speedT * 3.7) * 0.5) - Math.cos((basePos.z + speedT * 4.2) * 0.6);
      const nz = Math.cos((basePos.z - speedT * 3.3) * 0.5) - Math.sin((basePos.x + speedT * 4.6) * 0.7);
      const scale = 8.0;
      x = cx + nx * scale;
      y = 3.0 + ny * (scale * 1.3 * vertical);
      z = cz + nz * scale;
      break;
  }

  return new THREE.Vector3(x, y, z);
}