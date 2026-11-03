import type { Camera, Frame } from '../store';
import { useStore } from '../store';

export const viewport = { w: 1200, h: 800 };

export function fitRect(x: number, y: number, w: number, h: number, pad = 64): Camera {
  const zoom = Math.min((viewport.w - pad * 2) / w, (viewport.h - pad * 2) / h);
  return { zoom, x: x + w / 2 - viewport.w / 2 / zoom, y: y + h / 2 - viewport.h / 2 / zoom };
}

export const fitFrame = (f: Frame, pad = 64) => fitRect(f.x, f.y, f.w, f.h, pad);

export function fitAll(frames: Frame[]): Camera {
  if (!frames.length) return { x: -viewport.w / 2, y: -viewport.h / 2, zoom: 1 };
  const x0 = Math.min(...frames.map((f) => f.x));
  const y0 = Math.min(...frames.map((f) => f.y));
  const x1 = Math.max(...frames.map((f) => f.x + f.w));
  const y1 = Math.max(...frames.map((f) => f.y + f.h));
  return fitRect(x0, y0, x1 - x0, y1 - y0, 96);
}

/** Smoothly animates the editor camera to a target. */
let anim = 0;
export function flyTo(target: Camera, ms = 520) {
  cancelAnimationFrame(anim);
  const from = useStore.getState().camera;
  const start = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - k, 4);
    useStore.getState().setCamera(interp(from, target, e, 0.15));
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}

/** Interpolates two cameras by their screen centers, with a zoom-out arc in the middle. */
export function interp(a: Camera, b: Camera, e: number, arc = 0.35): Camera {
  const ca = { x: a.x + viewport.w / 2 / a.zoom, y: a.y + viewport.h / 2 / a.zoom };
  const cb = { x: b.x + viewport.w / 2 / b.zoom, y: b.y + viewport.h / 2 / b.zoom };
  const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * e) * (1 - arc * Math.sin(Math.PI * e));
  const cx = ca.x + (cb.x - ca.x) * e;
  const cy = ca.y + (cb.y - ca.y) * e;
  return { zoom, x: cx - viewport.w / 2 / zoom, y: cy - viewport.h / 2 / zoom };
}
