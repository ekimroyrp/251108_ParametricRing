import { ProfilePoint } from '../types/profile';
import { useEditorStore } from './store';

type PointerState = {
  pointId: string | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export class ProfileEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pointer: PointerState = { pointId: null };
  private unsubscribe: () => void;

  constructor(private host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'profile-editor__canvas';
    this.host.appendChild(this.canvas);
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create 2D context for profile editor.');
    }
    this.ctx = context;

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);

    this.unsubscribe = useEditorStore.subscribe(() => this.render());

    this.render();
  }

  public dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.unsubscribe?.();
  }

  private handleResize = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.host.clientWidth * dpr;
    this.canvas.height = this.host.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  };

  private handlePointerDown = (event: PointerEvent) => {
    const point = this.pickPoint(event);
    this.canvas.setPointerCapture(event.pointerId);
    this.pointer.pointId = point?.id ?? null;
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.pointer.pointId || event.buttons === 0) return;
    const { cx, cy, radius } = this.getGeometry();
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = x - cx;
    const dy = y - cy;
    const angle = Math.atan2(dy, dx);
    const magnitude = clamp(Math.sqrt(dx * dx + dy * dy) / radius, 0.1, 0.95);

    useEditorStore.getState().updatePoint(this.pointer.pointId, (point) => ({
      ...point,
      angle,
      radius: magnitude
    }));
  };

  private handlePointerUp = (event: PointerEvent) => {
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.pointer.pointId = null;
  };

  private pickPoint(event: PointerEvent): ProfilePoint | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { cx, cy, radius } = this.getGeometry();
    const hitRadius = 12;

    return useEditorStore
      .getState()
      .profile.points.find((point) => {
        const px = cx + Math.cos(point.angle) * point.radius * radius;
        const py = cy + Math.sin(point.angle) * point.radius * radius;
        return Math.hypot(px - x, py - y) <= hitRadius;
      });
  }

  private getGeometry() {
    const size = Math.min(this.host.clientWidth, this.host.clientHeight) - 24;
    const cx = this.host.clientWidth / 2;
    const cy = this.host.clientHeight / 2;
    const radius = size / 2;
    return { cx, cy, radius };
  }

  private render() {
    const { cx, cy, radius } = this.getGeometry();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.host.clientWidth, this.host.clientHeight);

    ctx.save();
    ctx.translate(0.5, 0.5);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const { points } = useEditorStore.getState().profile;
    const ordered = [...points].sort((a, b) => a.angle - b.angle);
    ctx.strokeStyle = 'rgba(96,150,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ordered.forEach((point, index) => {
      const px = cx + Math.cos(point.angle) * point.radius * radius;
      const py = cy + Math.sin(point.angle) * point.radius * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    if (ordered.length > 2) {
      const first = ordered[0];
      ctx.lineTo(
        cx + Math.cos(first.angle) * first.radius * radius,
        cy + Math.sin(first.angle) * first.radius * radius
      );
    }
    ctx.stroke();

    points.forEach((point) => {
      const px = cx + Math.cos(point.angle) * point.radius * radius;
      const py = cy + Math.sin(point.angle) * point.radius * radius;
      ctx.fillStyle =
        point.id === this.pointer.pointId ? '#6da9ff' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}
