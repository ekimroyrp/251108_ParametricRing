import * as THREE from 'three';
import { ProfilePoint, ProfileShape } from '../types/profile';

export const TAU = Math.PI * 2;

export const normalizeAngle = (angle: number) => {
  const wrapped = angle % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
};

export const orderProfilePoints = (points: ProfilePoint[]) =>
  [...points]
    .map((point) => ({ ...point, angle: normalizeAngle(point.angle) }))
    .sort((a, b) => a.angle - b.angle);

export const sampleProfilePoints = (
  profile: ProfileShape,
  resolution: number
): THREE.Vector2[] => {
  const ordered = orderProfilePoints(profile.points);
  const targetResolution = Math.max(resolution, ordered.length * 4, 16);

  if (ordered.length < 3) {
    return Array.from({ length: targetResolution }, (_, i) => {
      const t = (i / targetResolution) * TAU;
      return new THREE.Vector2(Math.cos(t) * 0.5, Math.sin(t) * 0.5);
    });
  }

  const controlPoints = ordered.map(
    (point) =>
      new THREE.Vector3(
        Math.cos(point.angle) * point.radius,
        Math.sin(point.angle) * point.radius,
        0
      )
  );

  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal', 0.5);
  const samples = curve.getPoints(targetResolution);
  return samples.map((sample) => new THREE.Vector2(sample.x, sample.y));
};
