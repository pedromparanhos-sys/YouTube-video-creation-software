// Draws any kind of frame (JS code or rendered Manim video) at local time t.
import type { Frame } from '../store';
import { drawScene } from './runtime';

const videos = new Map<string, HTMLVideoElement>();

/** One <video> per channel+frame+url: the editor canvas and the output (export/present) never fight over a clock. */
function videoFor(frameId: string, url: string, channel: string) {
  const key = `${channel}|${frameId}|${url}`;
  let v = videos.get(key);
  if (!v) {
    for (const [k, old] of videos) if (k.startsWith(`${channel}|${frameId}|`)) (old.pause(), old.removeAttribute('src'), videos.delete(k));
    v = document.createElement('video');
    v.crossOrigin = 'anonymous'; // keeps the canvas exportable
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;
    videos.set(key, v);
  }
  return v;
}

/** Keeps a video near time t: plays along when `running`, seeks precisely when paused. */
function sync(v: HTMLVideoElement, t: number, running: boolean) {
  const dur = Number.isFinite(v.duration) ? v.duration : Infinity;
  const target = Math.min(t, Math.max(0, dur - 0.04));
  if (running && t < dur) {
    if (v.paused) v.play().catch(() => {});
    if (Math.abs(v.currentTime - target) > 0.25 && !v.seeking) v.currentTime = target;
  } else {
    if (!v.paused) v.pause();
    if (Math.abs(v.currentTime - target) > 0.02 && !v.seeking) v.currentTime = target;
  }
}

const FONT = '"Inter Variable", sans-serif';

export function drawFrameContent(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  t: number,
  x: number,
  y: number,
  w: number,
  h: number,
  running: boolean,
  channel: 'editor' | 'output' = 'editor',
) {
  if (f.kind !== 'manim') {
    drawScene(ctx, f.id, f.code, t, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(x, y, w, h);
  const url = f.render?.url;
  const v = url ? videoFor(f.id, url, channel) : null;
  if (v && v.readyState >= 2) {
    sync(v, t, running);
    // contain the video inside the frame
    const k = Math.min(w / v.videoWidth, h / v.videoHeight);
    const vw = v.videoWidth * k;
    const vh = v.videoHeight * k;
    ctx.drawImage(v, x + (w - vw) / 2, y + (h - vh) / 2, vw, vh);
  } else {
    if (v) sync(v, t, false);
    const s = w / 1920;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8b7cf6';
    ctx.font = `600 ${56 * s}px ${FONT}`;
    ctx.fillText('Manim', x + w / 2, y + h / 2 - 40 * s);
    ctx.fillStyle = '#7d838f';
    ctx.font = `400 ${36 * s}px ${FONT}`;
    const status = f.render?.status;
    const msg =
      status === 'rendering' ? 'Renderizando…' : status === 'error' ? 'Erro na renderização' : url ? 'Carregando vídeo…' : 'Ainda não renderizada';
    ctx.fillText(msg, x + w / 2, y + h / 2 + 30 * s);
  }
  // stale marker: code changed since the last render
  if (url && f.render?.code !== undefined && f.render.code !== f.code) {
    const s = Math.max(0.5, w / 1920);
    ctx.fillStyle = 'rgba(245,194,107,0.9)';
    ctx.font = `500 ${Math.max(10, 26 * s)}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('código alterado · renderize de novo', x + w - 24 * s, y + 20 * s);
  }
  ctx.restore();
}
