import { locate, totalDuration, type Frame } from '../store';
import { drawScene } from './runtime';

/** Renders the video at `time` into a W×H canvas, letterboxing frames of other aspect ratios. */
export function renderVideoFrame(ctx: CanvasRenderingContext2D, frames: Frame[], time: number, W: number, H: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const loc = locate(frames, time);
  if (!loc) return;
  const f = loc.frame;
  const k = Math.min(W / f.w, H / f.h);
  const w = f.w * k;
  const h = f.h * k;
  drawScene(ctx, f.id, f.code, loc.local, (W - w) / 2, (H - h) / 2, w, h);
}

function pickMime() {
  const options = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return options.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}

/** Real-time export via MediaRecorder. Returns a cancel function. */
export function exportVideo(
  frames: Frame[],
  onProgress: (p: number) => void,
  onDone: (blob: Blob | null, error?: string) => void,
  W = 1920,
  H = 1080,
  fps = 30,
) {
  const mime = pickMime();
  if (!mime) {
    onDone(null, 'Este navegador não grava vídeo (MediaRecorder indisponível).');
    return () => {};
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  let cancelled = false;
  rec.onstop = () => onDone(cancelled ? null : new Blob(chunks, { type: 'video/webm' }));
  const total = totalDuration(frames);
  renderVideoFrame(ctx, frames, 0, W, H);
  rec.start(250);
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = (now - start) / 1000;
    renderVideoFrame(ctx, frames, Math.min(t, total), W, H);
    onProgress(Math.min(1, t / total));
    if (t >= total || cancelled) {
      rec.stop();
      stream.getTracks().forEach((tr) => tr.stop());
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    if (rec.state !== 'inactive') rec.stop();
  };
}
