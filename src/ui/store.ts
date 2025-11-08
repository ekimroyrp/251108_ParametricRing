import { v4 as uuid } from 'uuid';
import { create } from 'zustand';
import { ProfileShape, ProfilePoint, SweepParameters } from '../types/profile';

const createDefaultProfile = (): ProfileShape => ({
  points: [
    { id: uuid(), angle: 0, radius: 0.45 },
    { id: uuid(), angle: Math.PI / 2, radius: 0.5 },
    { id: uuid(), angle: Math.PI, radius: 0.45 },
    { id: uuid(), angle: (3 * Math.PI) / 2, radius: 0.5 }
  ]
});

const defaultSweep: SweepParameters = {
  profileCount: 64,
  twist: 0,
  radialScale: 1,
  profileScale: 1
};

type EditorStore = {
  profile: ProfileShape;
  sweep: SweepParameters;
  updatePoint: (id: string, updater: (point: ProfilePoint) => ProfilePoint) => void;
  setSweep: (partial: Partial<SweepParameters>) => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  profile: createDefaultProfile(),
  sweep: defaultSweep,
  updatePoint: (id, updater) =>
    set((state) => ({
      profile: {
        points: state.profile.points.map((point) =>
          point.id === id ? updater(point) : point
        )
      }
    })),
  setSweep: (partial) =>
    set((state) => ({
      sweep: { ...state.sweep, ...partial }
    }))
}));
