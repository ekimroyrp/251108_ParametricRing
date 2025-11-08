import { v4 as uuid } from 'uuid';
import { createStore } from 'zustand/vanilla';
import { ProfileShape, ProfilePoint, SweepParameters } from '../types/profile';
import { normalizeAngle, orderProfilePoints } from '../utils/profile';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createDefaultProfile = (): ProfileShape => ({
  points: orderProfilePoints([
    { id: uuid(), angle: 0, radius: 0.45 },
    { id: uuid(), angle: Math.PI / 2, radius: 0.5 },
    { id: uuid(), angle: Math.PI, radius: 0.45 },
    { id: uuid(), angle: (3 * Math.PI) / 2, radius: 0.5 }
  ])
});

const defaultSweep: SweepParameters = {
  profileCount: 64,
  twist: 0,
  radialScale: 1,
  profileScale: 1,
  scaleVariance: 0.15,
  profileResolution: 72
};

type EditorStore = {
  profile: ProfileShape;
  sweep: SweepParameters;
  updatePoint: (id: string, updater: (point: ProfilePoint) => ProfilePoint) => void;
  setSweep: (partial: Partial<SweepParameters>) => void;
  resetProfile: () => void;
  resetSweep: () => void;
};

export const useEditorStore = createStore<EditorStore>((set) => ({
  profile: createDefaultProfile(),
  sweep: defaultSweep,
  updatePoint: (id, updater) =>
    set((state) => ({
      profile: {
        points: orderProfilePoints(
          state.profile.points.map((point) =>
            point.id === id
              ? updater({
                  ...point,
                  angle: normalizeAngle(point.angle)
                })
              : point
          )
        )
      }
    })),
  setSweep: (partial) =>
    set((state) => {
      const next: SweepParameters = {
        ...state.sweep,
        ...partial
      };
      return {
        sweep: {
          profileCount: Math.round(clamp(next.profileCount, 8, 256)),
          twist: clamp(next.twist, -720, 720),
          radialScale: clamp(next.radialScale, 0.25, 2.5),
          profileScale: clamp(next.profileScale, 0.1, 3),
          scaleVariance: clamp(next.scaleVariance, 0, 1),
          profileResolution: Math.round(clamp(next.profileResolution, 12, 256))
        }
      };
    }),
  resetProfile: () => set({ profile: createDefaultProfile() }),
  resetSweep: () => set({ sweep: defaultSweep })
}));
