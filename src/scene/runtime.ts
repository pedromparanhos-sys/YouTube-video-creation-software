// Scene runtime: every scene is a function of time.
// User code is the body of `function (ctx, t, w, h, lib)`.

export type SceneFn = (
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  lib: SceneLib,
) => void;

export type Compiled = { fn: SceneFn | null; error: string | null };

const cache = new Map<string, Compiled>();

export function compileScene(code: string): Compiled {
  const hit = cache.get(code);
  if (hit) return hit;
  let result: Compiled;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function('ctx', 't', 'w', 'h', 'lib', `"use strict";\n${code}`) as SceneFn;
    result = { fn, error: null };
  } catch (e) {
    result = { fn: null, error: (e as Error).message };
  }
  if (cache.size > 200) cache.clear();
  cache.set(code, result);
  return result;
}

const runtimeErrors = new Map<string, string>();
export const getRuntimeError = (frameId: string) => runtimeErrors.get(frameId) ?? null;

/** Draws a scene into a rect of `ctx` (already in screen space). Scene space is 1920 wide. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  frameId: string,
  code: string,
  t: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const W = 1920;
  const H = (1920 * height) / width;
  const { fn, error } = compileScene(code);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(width / W, width / W);
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(0, 0, W, H);
  let err = error;
  if (fn) {
    try {
      ctx.save();
      fn(ctx, Math.max(0, t), W, H, lib);
      ctx.restore();
      runtimeErrors.delete(frameId);
    } catch (e) {
      err = (e as Error).message;
    }
  }
  if (err) {
    runtimeErrors.set(frameId, err);
    ctx.fillStyle = 'rgba(10,11,13,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff8a8a';
    ctx.font = '500 40px "JetBrains Mono Variable", monospace';
    ctx.fillText('Erro na cena', 80, 120);
    ctx.fillStyle = '#c9ccd3';
    ctx.font = '32px "JetBrains Mono Variable", monospace';
    ctx.fillText(err.slice(0, 90), 80, 180);
  }
  ctx.restore();
}

// ---------- helpers available to scenes as `lib` ----------

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = {
  linear: (k: number) => clamp(k),
  inOut: (k: number) => {
    k = clamp(k);
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  },
  out: (k: number) => 1 - Math.pow(1 - clamp(k), 3),
  in: (k: number) => Math.pow(clamp(k), 3),
};
/** progress of t inside [start, start+dur], eased */
const span = (t: number, start: number, dur: number, fn = ease.inOut) => fn((t - start) / dur);

const colors = {
  bg: '#0a0b0d',
  ink: '#eceef2',
  dim: '#7d838f',
  grid: '#1c1f26',
  violet: '#8b7cf6',
  blue: '#5ea3ff',
  mint: '#7ee2b8',
  amber: '#f5c26b',
  red: '#ff6b6b',
};

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  opts: { size?: number; weight?: number; color?: string; align?: CanvasTextAlign; mono?: boolean } = {},
) {
  const { size = 64, weight = 500, color = colors.ink, align = 'left', mono = false } = opts;
  ctx.font = `${weight} ${size}px ${mono ? '"JetBrains Mono Variable", monospace' : '"Inter Variable", sans-serif'}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

/** Draws axes centered at (ox, oy). Returns a mapper from math coords to scene coords. */
function axes(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  sx: number,
  sy: number,
  opts: { xRange?: [number, number]; yRange?: [number, number]; progress?: number } = {},
) {
  const { xRange = [-5, 5], yRange = [-2, 2], progress = 1 } = opts;
  const map = (x: number, y: number): [number, number] => [ox + x * sx, oy - y * sy];
  ctx.save();
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 2;
  for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x++) {
    const [px] = map(x, 0);
    ctx.beginPath();
    ctx.moveTo(px, map(0, yRange[1])[1]);
    ctx.lineTo(px, map(0, yRange[1])[1] + (map(0, yRange[0])[1] - map(0, yRange[1])[1]) * progress);
    ctx.stroke();
  }
  ctx.strokeStyle = colors.dim;
  ctx.lineWidth = 3;
  const [x0] = map(xRange[0], 0);
  const [x1] = map(xRange[1], 0);
  ctx.beginPath();
  ctx.moveTo(x0, oy);
  ctx.lineTo(lerp(x0, x1, progress), oy);
  ctx.stroke();
  const [, y0] = map(0, yRange[0]);
  const [, y1] = map(0, yRange[1]);
  ctx.beginPath();
  ctx.moveTo(ox, y0);
  ctx.lineTo(ox, lerp(y0, y1, progress));
  ctx.stroke();
  ctx.restore();
  return map;
}

/** Plots f over [a,b], drawn up to `progress` (0..1). */
function plot(
  ctx: CanvasRenderingContext2D,
  map: (x: number, y: number) => [number, number],
  f: (x: number) => number,
  a: number,
  b: number,
  opts: { color?: string; width?: number; progress?: number; steps?: number } = {},
) {
  const { color = colors.blue, width = 6, progress = 1, steps = 400 } = opts;
  const end = lerp(a, b, clamp(progress));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = lerp(a, end, i / steps);
    const [px, py] = map(x, f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/** Isometric voxel cube. (gx, gy, gz) in grid units, `s` = cube size in px. */
function voxel(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  gx: number,
  gy: number,
  gz: number,
  s: number,
  color = colors.violet,
) {
  const cx = ox + (gx - gy) * s * 0.866;
  const cy = oy + (gx + gy) * s * 0.5 - gz * s;
  const top = shade(color, 1.15);
  const left = shade(color, 0.7);
  const right = shade(color, 0.45);
  const p = (dx: number, dy: number) => [cx + dx * s * 0.866, cy + dy * s * 0.5] as const;
  const poly = (pts: (readonly [number, number])[], fill: string) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,11,13,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  const [tx, ty] = p(0, -1);
  const [rx, ry] = p(1, 0);
  const [bx, by] = p(0, 1);
  const [lx, ly] = p(-1, 0);
  poly([[tx, ty], [rx, ry], [bx, by], [lx, ly]], top);
  poly([[lx, ly], [bx, by], [bx, by + s], [lx, ly + s]], left);
  poly([[bx, by], [rx, ry], [rx, ry + s], [bx, by + s]], right);
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * k, 0, 255);
  const g = clamp(((n >> 8) & 255) * k, 0, 255);
  const b = clamp((n & 255) * k, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Deterministic pseudo-random in [0,1) from a seed. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const lib = { clamp, lerp, ease, span, colors, text, axes, plot, voxel, shade, rand };
export type SceneLib = typeof lib;
