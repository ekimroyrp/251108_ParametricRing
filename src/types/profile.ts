export type ProfilePoint = {
  id: string;
  angle: number; // radians, relative to profile circle center
  radius: number; // normalized [0, 1]
};

export type ProfileShape = {
  points: ProfilePoint[];
};

export type SweepParameters = {
  profileCount: number;
  twist: number; // degrees across full loop
  radialScale: number;
  profileScale: number;
  scaleVariance: number;
  profileResolution: number;
};

export type SculptSettings = {
  enabled: boolean;
  radius: number;
  strength: number;
};

export type EditorState = {
  profile: ProfileShape;
  sweep: SweepParameters;
  sculpt: SculptSettings;
};
