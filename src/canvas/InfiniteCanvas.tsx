import { useEffect, useRef, useState } from 'react';
import { locate, useStore, type Frame } from '../store';
import { drawFrameContent } from '../scene/frameContent';
import { fitAll, fitFrame, interp, viewport } from './camera';

const C = {
  ground: '#0c0d10',
  dot: '#22252d',
  major: '#16181d',
  border: '#2a2d36',
  label: '#8a8f9a',
  labelStrong: '#d6d8de',
  violet: '#8b7cf6',
  blue: '#5ea3ff',
};

type Drag =
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'move'; id: string; sx: number; sy: number; fx: number; fy: number }
  | { kind: 'resize'; id: string; fx: number; fy: number; ratio: number }
  | { kind: 'create'; wx: number; wy: number; cur: { x: number; y: number; w: number; h: number } | null };

const FLIGHT = 0.9; // seconds the camera spends flying into a new frame during playback

export function InfiniteCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [cursor, setCursor] = useState('default');
  const flight = useRef<{ index: number; from: ReturnType<typeof useStore.getState>['camera']; at: number } | null>(null);

  // size
  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      viewport.w = r.width;
      viewport.h = r.height;
      const c = ref.current!;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      if (!fitted) {
        fitted = true;
        useStore.getState().setCamera(fitAll(useStore.getState().frames));
      }
    });
    let fitted = false;
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // render loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext('2d')!;
      const s = useStore.getState();
      const dpr = window.devicePixelRatio || 1;

      // playback camera: fly along the route into the active frame
      const loc = locate(s.frames, s.time);
      if (s.playing && loc) {
        if (!flight.current || flight.current.index !== loc.index) {
          flight.current = { index: loc.index, from: s.camera, at: loc.local };
        }
        const target = fitFrame(loc.frame, 48);
        const k = Math.min(1, (loc.local - flight.current.at) / FLIGHT);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const cam = interp(flight.current.from, target, e);
        if (k < 1 || Math.abs(cam.zoom - s.camera.zoom) > 1e-6) s.setCamera(cam);
      } else {
        flight.current = null;
      }

      const cam = useStore.getState().camera;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.ground;
      ctx.fillRect(0, 0, viewport.w, viewport.h);
      drawGrid(ctx, cam);

      const toS = (x: number, y: number) => [(x - cam.x) * cam.zoom, (y - cam.y) * cam.zoom] as const;

      drawRoute(ctx, s.frames, toS, cam.zoom, loc?.index ?? -1, s.playing);

      s.frames.forEach((f, i) => {
        const [x, y] = toS(f.x, f.y);
        const w = f.w * cam.zoom;
        const h = f.h * cam.zoom;
        if (x > viewport.w || y > viewport.h || x + w < 0 || y + h < 0) return;
        const isActive = loc?.index === i;
        const t = isActive ? loc!.local : f.duration;
        drawFrameContent(ctx, f, t, x, y, w, h, isActive && s.playing);
        const selected = s.selectedId === f.id;
        ctx.lineWidth = selected ? 2 : 1;
        ctx.strokeStyle = selected ? C.violet : isActive && s.playing ? C.blue : C.border;
        ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
        // label
        ctx.font = '500 12px "Inter Variable", sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? C.labelStrong : C.label;
        const idx = String(i + 1).padStart(2, '0');
        ctx.font = '500 11px "JetBrains Mono Variable", monospace';
        ctx.fillStyle = selected ? C.violet : C.label;
        ctx.fillText(idx, x, y - 8);
        const iw = ctx.measureText(idx).width;
        ctx.font = '500 12px "Inter Variable", sans-serif';
        ctx.fillStyle = selected ? C.labelStrong : C.label;
        ctx.fillText(f.name, x + iw + 8, y - 8);
        if (selected) {
          ctx.fillStyle = C.ground;
          ctx.strokeStyle = C.violet;
          ctx.lineWidth = 1.5;
          for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
            ctx.fillRect(hx - 4, hy - 4, 8, 8);
            ctx.strokeRect(hx - 4, hy - 4, 8, 8);
          }
        }
      });

      const d = drag.current;
      if (d?.kind === 'create' && d.cur) {
        const [x, y] = toS(d.cur.x, d.cur.y);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = C.violet;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, d.cur.w * cam.zoom, d.cur.h * cam.zoom);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(139,124,246,0.06)';
        ctx.fillRect(x, y, d.cur.w * cam.zoom, d.cur.h * cam.zoom);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // wheel: pan, ctrl/cmd + wheel (or pinch): zoom at cursor
  useEffect(() => {
    const el = ref.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = useStore.getState();
      if (s.playing) s.setPlaying(false);
      const cam = s.camera;
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const wx = cam.x + mx / cam.zoom;
        const wy = cam.y + my / cam.zoom;
        const zoom = Math.min(8, Math.max(0.02, cam.zoom * Math.exp(-e.deltaY * 0.01)));
        s.setCamera({ zoom, x: wx - mx / zoom, y: wy - my / zoom });
      } else {
        s.setCamera({ ...cam, x: cam.x + e.deltaX / cam.zoom, y: cam.y + e.deltaY / cam.zoom });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const toWorld = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const cam = useStore.getState().camera;
    return { x: cam.x + (e.clientX - r.left) / cam.zoom, y: cam.y + (e.clientY - r.top) / cam.zoom };
  };

  const hit = (wx: number, wy: number) => {
    const { frames, camera } = useStore.getState();
    const handle = 8 / camera.zoom;
    for (let i = frames.length - 1; i >= 0; i--) {
      const f = frames[i];
      if (Math.abs(wx - (f.x + f.w)) < handle && Math.abs(wy - (f.y + f.h)) < handle) return { f, part: 'resize' as const };
      if (wx >= f.x && wx <= f.x + f.w && wy >= f.y && wy <= f.y + f.h) return { f, part: 'body' as const };
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    ref.current!.setPointerCapture(e.pointerId);
    const s = useStore.getState();
    if (s.playing) s.setPlaying(false);
    const w = toWorld(e);
    if (e.button === 1 || s.tool === 'hand') {
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: s.camera.x, cy: s.camera.y };
      setCursor('grabbing');
      return;
    }
    if (s.tool === 'frame') {
      drag.current = { kind: 'create', wx: w.x, wy: w.y, cur: null };
      return;
    }
    const h = hit(w.x, w.y);
    if (!h) {
      s.select(null);
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: s.camera.x, cy: s.camera.y };
      setCursor('grabbing');
      return;
    }
    s.select(h.f.id);
    drag.current =
      h.part === 'resize'
        ? { kind: 'resize', id: h.f.id, fx: h.f.x, fy: h.f.y, ratio: h.f.h / h.f.w }
        : { kind: 'move', id: h.f.id, sx: w.x, sy: w.y, fx: h.f.x, fy: h.f.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = useStore.getState();
    const d = drag.current;
    const w = toWorld(e);
    if (!d) {
      if (s.tool === 'hand') setCursor('grab');
      else if (s.tool === 'frame') setCursor('crosshair');
      else {
        const h = hit(w.x, w.y);
        setCursor(h?.part === 'resize' ? 'nwse-resize' : h ? 'move' : 'default');
      }
      return;
    }
    if (d.kind === 'pan') {
      const z = s.camera.zoom;
      s.setCamera({ ...s.camera, x: d.cx - (e.clientX - d.sx) / z, y: d.cy - (e.clientY - d.sy) / z });
    } else if (d.kind === 'move') {
      s.updateFrame(d.id, { x: Math.round(d.fx + w.x - d.sx), y: Math.round(d.fy + w.y - d.sy) });
    } else if (d.kind === 'resize') {
      const nw = Math.max(320, w.x - d.fx);
      const ratio = e.altKey ? (w.y - d.fy) / nw : d.ratio;
      s.updateFrame(d.id, { w: Math.round(nw), h: Math.round(Math.max(180, nw * ratio)) });
    } else if (d.kind === 'create') {
      const wdt = Math.abs(w.x - d.wx);
      const ratio = e.shiftKey ? 16 / 9 : 9 / 16; // default 16:9, shift = 9:16 (Shorts)
      const hgt = wdt * ratio;
      d.cur = { x: w.x < d.wx ? d.wx - wdt : d.wx, y: w.y < d.wy ? d.wy - hgt : d.wy, w: wdt, h: hgt };
    }
  };

  const onPointerUp = () => {
    const s = useStore.getState();
    const d = drag.current;
    drag.current = null;
    setCursor(s.tool === 'hand' ? 'grab' : s.tool === 'frame' ? 'crosshair' : 'default');
    if (d?.kind === 'create') {
      const small = !d.cur || d.cur.w * s.camera.zoom < 24;
      const rect = small
        ? { x: d.wx - 960, y: d.wy - 540, w: 1920, h: 1080 }
        : { x: d.cur!.x, y: d.cur!.y, w: d.cur!.w, h: d.cur!.h };
      // normalize so the scene is always 1920 wide in scene space
      s.addFrame({ x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) });
      s.setTool('select');
    }
  };

  return (
    <div ref={wrap} className="canvas-wrap">
      <canvas
        ref={ref}
        className="canvas"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          const w = toWorld(e as unknown as React.PointerEvent);
          const h = hit(w.x, w.y);
          if (h) import('./camera').then((m) => m.flyTo(m.fitFrame(h.f)));
        }}
        aria-label="Canvas infinito"
      />
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, cam: { x: number; y: number; zoom: number }) {
  let step = 80;
  while (step * cam.zoom < 14) step *= 5;
  const major = step * 5;
  const x0 = Math.floor(cam.x / step) * step;
  const y0 = Math.floor(cam.y / step) * step;
  const x1 = cam.x + viewport.w / cam.zoom;
  const y1 = cam.y + viewport.h / cam.zoom;
  // major lines (drafting board)
  ctx.strokeStyle = C.major;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.floor(cam.x / major) * major; x <= x1; x += major) {
    const sx = Math.round((x - cam.x) * cam.zoom) + 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, viewport.h);
  }
  for (let y = Math.floor(cam.y / major) * major; y <= y1; y += major) {
    const sy = Math.round((y - cam.y) * cam.zoom) + 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(viewport.w, sy);
  }
  ctx.stroke();
  // dots
  ctx.fillStyle = C.dot;
  for (let x = x0; x <= x1; x += step) {
    const sx = (x - cam.x) * cam.zoom;
    for (let y = y0; y <= y1; y += step) {
      ctx.fillRect(sx - 1, (y - cam.y) * cam.zoom - 1, 2, 2);
    }
  }
}

function drawRoute(
  ctx: CanvasRenderingContext2D,
  frames: Frame[],
  toS: (x: number, y: number) => readonly [number, number],
  zoom: number,
  active: number,
  playing: boolean,
) {
  if (frames.length < 2) return;
  ctx.save();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    const [ax, ay] = toS(a.x + a.w / 2, a.y + a.h / 2);
    const [bx, by] = toS(b.x + b.w / 2, b.y + b.h / 2);
    const done = playing && i < active;
    ctx.strokeStyle = done ? 'rgba(94,163,255,0.7)' : 'rgba(139,124,246,0.45)';
    ctx.setLineDash(done ? [] : [5, 5]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    // arrow at the midpoint
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const ang = Math.atan2(by - ay, bx - ax);
    const s = Math.max(5, Math.min(9, 40 * zoom));
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(ang) * s, my + Math.sin(ang) * s);
    ctx.lineTo(mx + Math.cos(ang + 2.5) * s, my + Math.sin(ang + 2.5) * s);
    ctx.lineTo(mx + Math.cos(ang - 2.5) * s, my + Math.sin(ang - 2.5) * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
