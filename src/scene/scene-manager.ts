import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ProfileShape, SweepParameters } from '../types/profile';
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

    this.unsubscribe = useEditorStore.subscribe((state) =>
      this.updateRingMesh(state.profile, state.sweep)
    );

    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  public dispose() {
    window.removeEventListener('resize', this.handleResize);
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

    for (let i = 0; i <= segments; i++) {
      const segmentRatio = i / segments;
      const theta = segmentRatio * Math.PI * 2;
      const center = new THREE.Vector3(
        Math.cos(theta) * baseRadius,
        0,
        Math.sin(theta) * baseRadius
      );
      const outward = center.clone().normalize();
      const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
      const twist = THREE.MathUtils.degToRad(sweep.twist) * segmentRatio;
      const cosT = Math.cos(twist);
      const sinT = Math.sin(twist);
      const ease = THREE.MathUtils.smootherstep(segmentRatio, 0, 1);
      const variance = THREE.MathUtils.lerp(
        1 - sweep.scaleVariance,
        1 + sweep.scaleVariance,
        ease
      );
      const scale = sweep.profileScale * variance;

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

        indices.push(a, b, d);
        indices.push(b, c, d);
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
