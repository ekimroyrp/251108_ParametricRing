import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ProfileShape, SculptSettings, SweepParameters } from '../types/profile';
import { useEditorStore } from '../ui/store';
import { sampleProfilePoints } from '../utils/profile';

const BASE_RING_RADIUS = 1.35;

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private pmrem: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private frameId: number | null = null;
  private ringMesh: THREE.Mesh | null = null;
  private unsubscribe: () => void;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private sculptSettings: SculptSettings = { ...useEditorStore.getState().sculpt };
  private sculptState = { active: false, pointerId: null as number | null };
  private tempPosition = new THREE.Vector3();
  private tempNormal = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor('#050506');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050506');
    this.scene.fog = new THREE.Fog('#050506', 6, 14);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      50
    );
    this.camera.position.set(3.2, 1.8, 3.2);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.maxDistance = 8;
    this.controls.minDistance = 2;
    this.controls.target.set(0, 0, 0);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new RoomEnvironment();
    this.envTarget = this.pmrem.fromScene(envScene, 0.04);
    this.scene.environment = this.envTarget.texture;
    envScene.dispose();

    this.configureLights();
    this.buildGround();
    this.updateRingMesh(
      useEditorStore.getState().profile,
      useEditorStore.getState().sweep
    );

    this.unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (state.profile !== prev.profile || state.sweep !== prev.sweep) {
        this.updateRingMesh(state.profile, state.sweep);
      }
      this.sculptSettings = state.sculpt;
      if (!this.sculptSettings.enabled && !this.sculptState.active) {
        this.controls.enabled = true;
      }
    });

    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    window.addEventListener('pointermove', this.handleCanvasPointerMove);
    window.addEventListener('pointerup', this.handleCanvasPointerUp);
    this.startLoop();
  }

  public dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    window.removeEventListener('pointermove', this.handleCanvasPointerMove);
    window.removeEventListener('pointerup', this.handleCanvasPointerUp);
    this.controls.dispose();
    this.renderer.dispose();
    this.envTarget?.dispose();
    this.pmrem.dispose();
    this.unsubscribe?.();
    if (this.frameId) cancelAnimationFrame(this.frameId);
  }

  private configureLights() {
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.1);
    keyLight.position.set(5, 6, 3);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#7ab6ff', 0.8);
    rimLight.position.set(-4, 3, -2);
    this.scene.add(rimLight);

    const fill = new THREE.AmbientLight('#556080', 0.6);
    this.scene.add(fill);
  }

  private buildGround() {
    const geo = new THREE.CircleGeometry(12, 64);
    const mat = new THREE.MeshStandardMaterial({
      color: '#0d0f14',
      metalness: 0.1,
      roughness: 0.7
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -1.2;
    this.scene.add(mesh);
  }

  private startLoop = () => {
    this.frameId = requestAnimationFrame(this.startLoop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private handleCanvasPointerDown = (event: PointerEvent) => {
    if (!this.sculptSettings.enabled) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.sculptState = { active: true, pointerId: event.pointerId };
    this.controls.enabled = false;
  };

  private handleCanvasPointerMove = (event: PointerEvent) => {
    if (!this.sculptState.active || !this.sculptSettings.enabled) return;
    const intensity = (-event.movementY + event.movementX * 0.35) * 0.002;
    if (intensity === 0) return;
    this.applySculptStroke(event, intensity * this.sculptSettings.strength);
  };

  private handleCanvasPointerUp = (event: PointerEvent) => {
    if (this.sculptState.pointerId !== event.pointerId) return;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.sculptState = { active: false, pointerId: null };
    this.controls.enabled = true;
  };

  private applySculptStroke(event: PointerEvent, deltaStrength: number) {
    if (!this.ringMesh) return;
    this.updatePointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.ringMesh, false)[0];
    if (!hit) return;

    const geometry = this.ringMesh.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const normals = normalAttr.array as Float32Array;
    const brushRadius = this.sculptSettings.radius;

    for (let i = 0; i < positions.length; i += 3) {
      this.tempPosition.set(positions[i], positions[i + 1], positions[i + 2]);
      const distance = this.tempPosition.distanceTo(hit.point);
      if (distance > brushRadius) continue;
      const proximity = 1 - distance / brushRadius;
      const falloff = this.sculptFalloff(proximity);
      this.tempNormal.set(normals[i], normals[i + 1], normals[i + 2]);
      const offset = deltaStrength * falloff;
      this.tempPosition.addScaledVector(this.tempNormal, offset);
      positions[i] = this.tempPosition.x;
      positions[i + 1] = this.tempPosition.y;
      positions[i + 2] = this.tempPosition.z;
    }

    positionAttr.needsUpdate = true;
    geometry.computeVertexNormals();
    normalAttr.needsUpdate = true;
  }

  private updatePointerFromEvent(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private sculptFalloff(value: number) {
    const clamped = THREE.MathUtils.clamp(value, 0, 1);
    return THREE.MathUtils.smootherstep(clamped, 0, 1);
  }

  private updateRingMesh(profile: ProfileShape, sweep: SweepParameters) {
    if (this.ringMesh) {
      this.scene.remove(this.ringMesh);
      this.ringMesh.geometry.dispose();
      (this.ringMesh.material as THREE.Material).dispose();
      this.ringMesh = null;
    }

    const geometry = this.buildParametricGeometry(profile, sweep);
    const material = new THREE.MeshStandardMaterial({
      color: '#d3d7ff',
      metalness: 0.85,
      roughness: 0.25,
      envMapIntensity: 1.2
    });

    this.ringMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.ringMesh);
  }

  private buildParametricGeometry(profile: ProfileShape, sweep: SweepParameters) {
    const segments = Math.max(8, sweep.profileCount);
    const profileSamples = sampleProfilePoints(profile, sweep.profileResolution);
    const crossSection = profileSamples.length;
    const vertexCount = (segments + 1) * crossSection;

    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    let positionIndex = 0;
    let uvIndex = 0;
    const baseRadius = BASE_RING_RADIUS * sweep.radialScale;
    const up = new THREE.Vector3(0, 1, 0);

    const twistAmplitude = THREE.MathUtils.degToRad(sweep.twist);

    for (let i = 0; i <= segments; i++) {
      const segmentRatio = i / segments;
      const centeredRatio = segmentRatio - 0.5;
      const mirrored = 1 - Math.abs(1 - segmentRatio * 2); // 0 at seams, 1 at center
      const twistProgress = THREE.MathUtils.smootherstep(mirrored, 0, 1); // smooth 0→1→0 ramp

      const theta = segmentRatio * Math.PI * 2;
      const center = new THREE.Vector3(
        Math.cos(theta) * baseRadius,
        0,
        Math.sin(theta) * baseRadius
      );
      const outward = center.clone().normalize();
      const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
      const twist = twistAmplitude * twistProgress;
      const cosT = Math.cos(twist);
      const sinT = Math.sin(twist);
      const symmetryBlend = Math.pow(twistProgress, 0.85);
      const scaleVariance = 1 + sweep.scaleVariance * symmetryBlend;
      const scale = sweep.profileScale * scaleVariance;

      profileSamples.forEach((sample, j) => {
        const localXRaw = sample.x;
        const localYRaw = sample.y;

        const rotatedX = localXRaw * cosT - localYRaw * sinT;
        const rotatedY = localXRaw * sinT + localYRaw * cosT;

        const offset = outward.clone().multiplyScalar(rotatedX * scale).add(
          up.clone().multiplyScalar(rotatedY * scale)
        );
        const position = center.clone().add(offset);

        positions[positionIndex++] = position.x;
        positions[positionIndex++] = position.y;
        positions[positionIndex++] = position.z;

        uvs[uvIndex++] = segmentRatio;
        uvs[uvIndex++] = j / crossSection;
      });
    }

    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < crossSection; j++) {
        const a = i * crossSection + j;
        const b = (i + 1) * crossSection + j;
        const c = (i + 1) * crossSection + ((j + 1) % crossSection);
        const d = i * crossSection + ((j + 1) % crossSection);

        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}
