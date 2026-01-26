import * as THREE from 'three';
import { GeometryType } from '../types';

function mergeGeometriesSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: Float32Array[] = [];
  const normals: Float32Array[] = [];
  const colors: Float32Array[] = [];
  
  for (const g of geos) {
    const gg = g.index ? g.toNonIndexed() : g;
    const posAttr = gg.getAttribute('position');
    const normAttr = gg.getAttribute('normal');
    const colAttr = gg.getAttribute('color');
    
    if (posAttr) positions.push(posAttr.array as Float32Array);
    if (normAttr) normals.push(normAttr.array as Float32Array);
    if (colAttr) colors.push(colAttr.array as Float32Array);
  }

  const totalPos = positions.reduce((n, a) => n + a.length, 0);
  const mergedPos = new Float32Array(totalPos);
  const mergedNorm = new Float32Array(totalPos);
  // Default to white if no colors provided in some geoms
  const mergedCol = new Float32Array(totalPos);
  mergedCol.fill(1.0); 

  let offset = 0;
  for (let i = 0; i < positions.length; i++) {
    mergedPos.set(positions[i], offset);
    if (normals[i]) mergedNorm.set(normals[i], offset);
    if (colors[i]) mergedCol.set(colors[i], offset);
    offset += positions[i].length;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(mergedPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(mergedNorm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(mergedCol, 3));
  
  return geo;
}

/**
 * High-fidelity, smooth, organic fish model.
 */
function buildOrganicFish(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(1, 64, 64); 
  const pos = body.attributes.position;
  const vec = new THREE.Vector3();
  const len = 4.2; 
  
  for(let i = 0; i < pos.count; i++){
    vec.fromBufferAttribute(pos, i);
    const t = vec.z;
    let yFactor = 1.0;
    let xFactor = 1.0;
    
    if (t > 0) {
       yFactor = Math.pow(1.0 - Math.pow(t, 2.5), 0.5);
       xFactor = yFactor * 0.45;
       if(t > 0.2 && t < 0.35) { xFactor *= 0.96; yFactor *= 0.98; }
       if(t > 0.96) { vec.z -= (t - 0.96) * 0.3; if(vec.y < 0) vec.y *= 0.8; }
    } else {
       const absT = Math.abs(t);
       yFactor = Math.cos(absT * 1.57 * 0.9);
       if (absT > 0.5) {
           const tailT = (absT - 0.5) / 0.5;
           yFactor *= (1.0 - tailT * 0.65);
       }
       yFactor = Math.max(0.08, yFactor);
       xFactor = yFactor * 0.4;
    }
    
    if(vec.y < 0) vec.y *= 0.9; 
    if(vec.y > 0) vec.y *= 1.1;

    vec.x *= xFactor;
    vec.y *= yFactor;
    vec.z *= len * 0.5; 

    pos.setXYZ(i, vec.x, vec.y, vec.z);
  }
  body.computeVertexNormals();

  // Add dummy colors (white) for organic fish to match attribute layout
  const count = body.attributes.position.count;
  const colors = new Float32Array(count * 3).fill(1.0);
  body.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const extrudeSettings = { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, steps: 1 };

  // Helper to add colors to extruded parts
  const withColor = (geo: THREE.BufferGeometry) => {
      const c = new Float32Array(geo.attributes.position.count * 3).fill(1.0);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      return geo;
  };

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.bezierCurveTo(0.1, 0.2, 0.8, 1.5, 1.8, 2.2);
  tailShape.lineTo(1.4, 0.5);
  tailShape.lineTo(1.4, -0.5);
  tailShape.lineTo(1.8, -2.2);
  tailShape.bezierCurveTo(0.8, -1.5, 0.1, -0.2, 0, 0);

  const tail = withColor(new THREE.ExtrudeGeometry(tailShape, { ...extrudeSettings, depth: 0.02 }));
  tail.rotateY(Math.PI / 2);
  tail.translate(0, 0, -len * 0.5 + 0.1); 

  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0, 0);
  dorsalShape.quadraticCurveTo(0.5, 0.8, 1.5, 0.9); 
  dorsalShape.quadraticCurveTo(1.0, 0.2, 0.6, 0); 

  const dorsal = withColor(new THREE.ExtrudeGeometry(dorsalShape, extrudeSettings));
  dorsal.rotateY(Math.PI / 2);
  dorsal.translate(0, 0.45, 0.2); 

  const pecShape = new THREE.Shape();
  pecShape.moveTo(0, 0);
  pecShape.quadraticCurveTo(0.2, 0.0, 1.5, -0.4); 
  pecShape.lineTo(0.5, -0.5);
  pecShape.lineTo(0, 0);

  const pecL = withColor(new THREE.ExtrudeGeometry(pecShape, extrudeSettings));
  pecL.rotateY(-0.3);
  pecL.rotateX(Math.PI / 2 + 0.2);
  pecL.translate(0.25, -0.15, 0.9);

  const pecR = pecL.clone();
  pecR.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));

  const pelvShape = new THREE.Shape();
  pelvShape.moveTo(0,0);
  pelvShape.lineTo(0.3, -0.4);
  pelvShape.lineTo(0.1, 0);
  
  const pelvL = withColor(new THREE.ExtrudeGeometry(pelvShape, { ...extrudeSettings, depth: 0.02 }));
  pelvL.rotateY(0.1);
  pelvL.rotateX(Math.PI / 2);
  pelvL.translate(0.05, -0.38, 0.6);
  
  const pelvR = pelvL.clone();
  pelvR.applyMatrix4(new THREE.Matrix4().makeScale(-1,1,1));

  const analShape = new THREE.Shape();
  analShape.moveTo(0,0);
  analShape.lineTo(0.6, -0.4);
  analShape.lineTo(0.3, 0);
  
  const anal = withColor(new THREE.ExtrudeGeometry(analShape, extrudeSettings));
  anal.rotateY(Math.PI / 2);
  anal.translate(0, -0.22, -1.2);

  const eyeRadius = 0.08;
  const scleraGeo = withColor(new THREE.SphereGeometry(eyeRadius, 16, 16));
  const pupilGeo = withColor(new THREE.SphereGeometry(eyeRadius * 0.6, 16, 16));
  pupilGeo.translate(0, 0, eyeRadius * 0.8); 

  const eyePosZ = 1.3;
  const eyePosY = 0.12;
  const eyePosX = 0.18;

  const eyeL_Sclera = scleraGeo.clone();
  const eyeL_Pupil = pupilGeo.clone();
  eyeL_Sclera.scale(1, 0.9, 0.8);
  eyeL_Pupil.scale(1, 0.9, 0.5);

  const matL = new THREE.Matrix4().makeTranslation(eyePosX, eyePosY, eyePosZ);
  eyeL_Sclera.applyMatrix4(matL);
  eyeL_Pupil.applyMatrix4(matL);

  const eyeR_Sclera = scleraGeo.clone();
  const eyeR_Pupil = pupilGeo.clone();
  eyeR_Sclera.scale(1, 0.9, 0.8);
  eyeR_Pupil.scale(1, 0.9, 0.5);

  const matR = new THREE.Matrix4().makeTranslation(-eyePosX, eyePosY, eyePosZ);
  eyeR_Sclera.applyMatrix4(matR);
  eyeR_Pupil.applyMatrix4(matR);

  const fish = mergeGeometriesSimple([
    body, tail, dorsal, pecL, pecR, pelvL, pelvR, anal, 
    eyeL_Sclera, eyeL_Pupil, eyeR_Sclera, eyeR_Pupil
  ]);
  
  [body, tail, dorsal, pecL, pecR, pelvL, pelvR, anal, 
   eyeL_Sclera, eyeL_Pupil, eyeR_Sclera, eyeR_Pupil, scleraGeo, pupilGeo
  ].forEach(g => g.dispose());

  return fish;
}

/**
 * Optimized Voxel Fish with Face Culling and Vertex AO
 */
function buildVoxelFish(): THREE.BufferGeometry {
    const voxelSize = 0.12;
    
    // 1. Define Sampling Bounds (Integer coordinates)
    const zStart = -2.2, zEnd = 2.2;
    const yStart = -1.0, yEnd = 1.0;
    const xStart = -0.7, xEnd = 0.7;

    const sizeX = Math.ceil((xEnd - xStart) / voxelSize) + 2; // +2 for padding
    const sizeY = Math.ceil((yEnd - yStart) / voxelSize) + 2;
    const sizeZ = Math.ceil((zEnd - zStart) / voxelSize) + 2;

    // 2. Sample implicit function into grid
    const grid = new Uint8Array(sizeX * sizeY * sizeZ);
    
    // Helper to map world to grid
    const toGrid = (x: number, y: number, z: number) => {
        const ix = Math.floor((x - xStart) / voxelSize) + 1;
        const iy = Math.floor((y - yStart) / voxelSize) + 1;
        const iz = Math.floor((z - zStart) / voxelSize) + 1;
        return { ix, iy, iz };
    };

    // Helper: Implicit function for fish body
    const isInsideFish = (x: number, y: number, z: number): boolean => {
        const t = z / 2.1; 
        let yRad = 0;
        let xRad = 0;
        if (t > 0) {
            yRad = Math.pow(1.0 - Math.pow(t, 2.5), 0.5);
            xRad = yRad * 0.45;
            if(t > 0.2 && t < 0.35) { xRad *= 0.94; yRad *= 0.96; }
            if(t > 0.92 && z > 2.0 && y < 0) return false;
        } else {
            const absT = Math.abs(t);
            yRad = Math.cos(absT * 1.57 * 0.9);
            if (absT > 0.5) {
                const tailT = (absT - 0.5) / 0.5;
                yRad *= (1.0 - tailT * 0.65);
            }
            yRad = Math.max(0.08, yRad);
            xRad = yRad * 0.4;
        }
        let yCheck = y;
        if(yCheck < 0) yCheck /= 0.9; else yCheck /= 1.1;
        if ( (x*x)/(xRad*xRad) + (yCheck*yCheck)/(yRad*yRad) <= 1.0 ) return true;

        if (z < -1.8) { // Tail
            const tz = -z - 1.8; const ty = Math.abs(y);
            if (x > -0.05 && x < 0.05) { if (ty < 0.5 + tz * 2.0 && ty > tz * 0.5) return true; }
        }
        if (z > 0.0 && z < 0.8 && y > 0.3) { // Dorsal
            const dz = (z - 0.0) / 0.8; const dy = y - 0.3;
            const maxH = 0.8 * Math.sin(dz * Math.PI); 
            if (dy < maxH && Math.abs(x) < 0.04) return true;
        }
        if (z > 0.6 && z < 1.2 && y < -0.1 && y > -0.5) { // Pec
            const px = Math.abs(x);
            if (px > 0.3 && px < 0.9) return true;
        }
        return false;
    };

    // Populate Grid
    for(let iz = 0; iz < sizeZ; iz++) {
        const z = zStart + (iz - 1) * voxelSize;
        for(let iy = 0; iy < sizeY; iy++) {
            const y = yStart + (iy - 1) * voxelSize;
            for(let ix = 0; ix < sizeX; ix++) {
                const x = xStart + (ix - 1) * voxelSize;
                if(isInsideFish(x,y,z)) {
                    grid[iz * sizeY * sizeX + iy * sizeX + ix] = 1;
                }
            }
        }
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    // 3. Meshing with Culling
    // Neighbors: +x, -x, +y, -y, +z, -z
    const offsets = [
        { dx: 1, dy: 0, dz: 0, norm: [1, 0, 0] },
        { dx: -1, dy: 0, dz: 0, norm: [-1, 0, 0] },
        { dx: 0, dy: 1, dz: 0, norm: [0, 1, 0] },
        { dx: 0, dy: -1, dz: 0, norm: [0, -1, 0] },
        { dx: 0, dy: 0, dz: 1, norm: [0, 0, 1] },
        { dx: 0, dy: 0, dz: -1, norm: [0, 0, -1] }
    ];

    const getIdx = (x: number, y: number, z: number) => z * sizeY * sizeX + y * sizeX + x;
    const isSolid = (x: number, y: number, z: number) => {
        if (x<0 || x>=sizeX || y<0 || y>=sizeY || z<0 || z>=sizeZ) return 0;
        return grid[getIdx(x,y,z)];
    };

    // Vertices for a unit cube centered at 0,0,0
    // We construct faces manually to control AO per vertex
    // Order: Quad faces (2 triangles)
    
    for(let iz = 1; iz < sizeZ-1; iz++) {
        for(let iy = 1; iy < sizeY-1; iy++) {
            for(let ix = 1; ix < sizeX-1; ix++) {
                if(!grid[getIdx(ix, iy, iz)]) continue;
                
                const wx = xStart + (ix - 1) * voxelSize;
                const wy = yStart + (iy - 1) * voxelSize;
                const wz = zStart + (iz - 1) * voxelSize;
                const half = voxelSize / 2;

                // Check each face
                // Right (+X)
                if(!isSolid(ix+1, iy, iz)) {
                    // Quad: (1,1,-1), (1,1,1), (1,-1,1), (1,-1,-1)
                    // Calculate AO for each vertex based on neighbors in that corner
                    // Simple heuristic: distance to "center of mass" of local neighbors
                    // Or just use height for fake shading
                    
                    const verts = [
                        [wx+half, wy+half, wz-half],
                        [wx+half, wy+half, wz+half],
                        [wx+half, wy-half, wz+half],
                        [wx+half, wy-half, wz-half]
                    ];
                    // Add 2 triangles
                    const indices = [0, 2, 1, 0, 3, 2];
                    
                    for(let i of indices) {
                        positions.push(verts[i][0], verts[i][1], verts[i][2]);
                        normals.push(1,0,0);
                        // Fake AO/Edge: Top vertices lighter, bottom darker
                        // And slight random noise for "Minecraft" texture feel
                        const ao = 0.8 + Math.random() * 0.1 + (verts[i][1] > wy ? 0.1 : -0.1);
                        colors.push(ao, ao, ao);
                    }
                }
                
                // Left (-X)
                if(!isSolid(ix-1, iy, iz)) {
                    const verts = [
                        [wx-half, wy+half, wz+half],
                        [wx-half, wy+half, wz-half],
                        [wx-half, wy-half, wz-half],
                        [wx-half, wy-half, wz+half]
                    ];
                    const indices = [0, 2, 1, 0, 3, 2];
                    for(let i of indices) {
                        positions.push(verts[i][0], verts[i][1], verts[i][2]);
                        normals.push(-1,0,0);
                        const ao = 0.8 + Math.random() * 0.1 + (verts[i][1] > wy ? 0.1 : -0.1);
                        colors.push(ao, ao, ao);
                    }
                }

                // Top (+Y)
                if(!isSolid(ix, iy+1, iz)) {
                    const verts = [
                        [wx-half, wy+half, wz-half],
                        [wx-half, wy+half, wz+half],
                        [wx+half, wy+half, wz+half],
                        [wx+half, wy+half, wz-half]
                    ];
                    const indices = [0, 2, 1, 0, 3, 2];
                    for(let i of indices) {
                        positions.push(verts[i][0], verts[i][1], verts[i][2]);
                        normals.push(0,1,0);
                        const ao = 0.95 + Math.random() * 0.05; // Brightest face
                        colors.push(ao, ao, ao);
                    }
                }

                // Bottom (-Y)
                if(!isSolid(ix, iy-1, iz)) {
                    const verts = [
                        [wx-half, wy-half, wz+half],
                        [wx-half, wy-half, wz-half],
                        [wx+half, wy-half, wz-half],
                        [wx+half, wy-half, wz+half]
                    ];
                    const indices = [0, 2, 1, 0, 3, 2];
                    for(let i of indices) {
                        positions.push(verts[i][0], verts[i][1], verts[i][2]);
                        normals.push(0,-1,0);
                        const ao = 0.6 + Math.random() * 0.1; // Darkest face
                        colors.push(ao, ao, ao);
                    }
                }

                // Front (+Z)
                if(!isSolid(ix, iy, iz+1)) {
                    const verts = [
                        [wx-half, wy+half, wz+half],
                        [wx+half, wy+half, wz+half],
                        [wx+half, wy-half, wz+half],
                        [wx-half, wy-half, wz+half]
                    ];
                    const indices = [0, 2, 1, 0, 3, 2];
                    for(let i of indices) {
                        positions.push(verts[i][0], verts[i][1], verts[i][2]);
                        normals.push(0,0,1);
                        const ao = 0.8 + Math.random() * 0.1 + (verts[i][1] > wy ? 0.1 : -0.1);
                        colors.push(ao, ao, ao);
                    }
                }

                // Back (-Z)
                if(!isSolid(ix, iy, iz-1)) {
                    const verts = [
                        [wx+half, wy+half, wz-half],
                        [wx-half, wy+half, wz-half],
                        [wx-half, wy-half, wz-half],
                        [wx+half, wy-half, wz-half]
                    ];
                    const indices = [0, 2, 1, 0, 3, 2];
                    for(let i of indices) {
                        positions.push(verts[i][0], verts[i][1], verts[i][2]);
                        normals.push(0,0,-1);
                        const ao = 0.8 + Math.random() * 0.1 + (verts[i][1] > wy ? 0.1 : -0.1);
                        colors.push(ao, ao, ao);
                    }
                }
            }
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return geo;
}

export function buildFishGeometry(type: GeometryType = 'organic'): THREE.BufferGeometry {
    if (type === 'voxel') {
        return buildVoxelFish();
    }
    return buildOrganicFish();
}