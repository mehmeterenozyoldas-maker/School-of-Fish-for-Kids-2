export enum AnimationMode {
  WAVE = 1,
  SCHOOL = 2,
  LISSAJOUS = 3,
  FLOW_FIELD = 4,
  TORUS_KNOT = 5,
  VORTEX_SCHOOL = 6,
  MURMURATION = 7,
  COLUMNS = 8,
  TURBULENCE = 9,
  SPIRAL = 10,
  DNA = 11,
  SPHERE = 12,
  ACCRETION = 13,
  KLEIN = 14,
  SUPERSHAPE = 15,
  FLOCK = 16, // New Boids Mode
}

export type PaletteType = 'natural' | 'neon' | 'sunset' | 'cyber' | 'cherry' | 'spectral' | 'plasma' | 'golden' | 'frozen';
export type GeometryType = 'organic' | 'voxel';

export interface SimulationParams {
  density: number; // Instance count
  speed: number;
  vertical: number;
  tailAmp: number;
  tailFreq: number;
  bands: number;
  jitter: number;
  fishScale: number;
  palette: PaletteType;
  geometry: GeometryType; // New param for design comparison
  mode: AnimationMode;
  // Visuals
  stereo: boolean; // Anaglyph 3D
  hologram: boolean; // Chromatic Aberration + Scanlines
}

export const ANIMATION_MODE_LABELS: Record<AnimationMode, string> = {
  [AnimationMode.WAVE]: 'Wave',
  [AnimationMode.SCHOOL]: 'School',
  [AnimationMode.LISSAJOUS]: 'Lissajous',
  [AnimationMode.FLOW_FIELD]: 'Flow-Field',
  [AnimationMode.TORUS_KNOT]: 'Torus-Knot',
  [AnimationMode.VORTEX_SCHOOL]: 'Vortex',
  [AnimationMode.MURMURATION]: 'Murmuration',
  [AnimationMode.COLUMNS]: 'Columns',
  [AnimationMode.TURBULENCE]: 'Turbulence',
  [AnimationMode.SPIRAL]: 'Galaxy',
  [AnimationMode.DNA]: 'DNA Helix',
  [AnimationMode.SPHERE]: 'Sphere',
  [AnimationMode.ACCRETION]: 'Accretion',
  [AnimationMode.KLEIN]: 'Klein Bottle',
  [AnimationMode.SUPERSHAPE]: 'Supershape',
  [AnimationMode.FLOCK]: 'Bio-Flock (Boids)',
};