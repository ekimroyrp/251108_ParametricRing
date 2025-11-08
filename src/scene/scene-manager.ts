import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ProfileShape, SweepParameters } from '../types/profile';
import { useEditorStore } from '../ui/store';

const BASE_RING_RADIUS = 1.35;

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: OrbitControls;
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
    const profilePoints = profile.points.length;
    const vertexCount = (segments + 1) * profilePoints;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

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
      const binormal = new THREE.Vector3().crossVectors(tangent, outward).normalize();

      const twist = THREE.MathUtils.degToRad(sweep.twist) * segmentRatio;
      const cosT = Math.cos(twist);
      const sinT = Math.sin(twist);

      profile.points.forEach((point, j) => {
        const idx = i * profilePoints + j;
        const radius = point.radius * 0.45 * sweep.profileScale;
        const localX = Math.cos(point.angle) * radius;
        const localY = Math.sin(point.angle) * radius;

        const rotatedX = localX * cosT - localY * sinT;
        const rotatedY = localX * sinT + localY * cosT;

        const position = center
          .clone()
          .add(outward.clone().multiplyScalar(rotatedX))
          .add(up.clone().multiplyScalar(rotatedY));

        positions[idx * 3] = position.x;
        positions[idx * 3 + 1] = position.y;
        positions[idx * 3 + 2] = position.z;

        const normal = position.clone().sub(center).normalize();
        normals[idx * 3] = normal.x;
        normals[idx * 3 + 1] = normal.y;
        normals[idx * 3 + 2] = normal.z;

        uvs[idx * 2] = segmentRatio;
        uvs[idx * 2 + 1] = j / profilePoints;
      });
    }

    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < profilePoints; j++) {
        const a = i * profilePoints + j;
        const b = (i + 1) * profilePoints + j;
        const c = (i + 1) * profilePoints + ((j + 1) % profilePoints);
        const d = i * profilePoints + ((j + 1) % profilePoints);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}
