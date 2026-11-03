// Client for the local Python service (server/main.py).
import { useEffect } from 'react';
import { useStore, type Frame } from '../store';

export const SERVER = (import.meta.env.VITE_FRAME_SERVER as string | undefined) ?? 'http://localhost:8765';

export function useServerHealth() {
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch(`${SERVER}/health`, { cache: 'no-store' });
        const j = await r.json();
        if (alive) useStore.getState().setServer({ status: 'online', manim: j.manim, ffmpeg: !!j.ffmpeg });
      } catch {
        if (alive) useStore.getState().setServer({ status: 'offline' });
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
}

export type Quality = 'preview' | 'hd' | 'full';

async function errorFrom(r: Response) {
  try {
    const j = await r.json();
    const d = j.detail;
    if (typeof d === 'string') return { message: d };
    return { message: d?.message ?? `Erro ${r.status}`, log: d?.log as string | undefined };
  } catch {
    return { message: `Erro ${r.status}` };
  }
}

/** Renders a Manim frame and stores the result on the frame. */
export async function renderManim(frame: Frame, quality: Quality, fitDuration: boolean) {
  const { updateFrame } = useStore.getState();
  const code = frame.code;
  updateFrame(frame.id, { render: { ...frame.render, status: 'rendering', error: undefined } });
  try {
    const r = await fetch(`${SERVER}/manim/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, quality, aspect: frame.w / frame.h }),
    });
    if (!r.ok) {
      const e = await errorFrom(r);
      updateFrame(frame.id, { render: { status: 'error', error: e.message, log: e.log } });
      return;
    }
    const j = await r.json();
    const patch: Partial<Frame> = {
      render: { status: 'done', url: `${SERVER}${j.url}`, duration: j.duration ?? undefined, code, log: j.log },
    };
    if (fitDuration && j.duration) patch.duration = Math.round(j.duration * 10) / 10;
    updateFrame(frame.id, patch);
  } catch {
    updateFrame(frame.id, {
      render: { status: 'error', error: 'Não foi possível falar com o serviço local. Ele está rodando na porta 8765?' },
    });
  }
}

/** Sends a WebM to the service and returns the MP4 URL. */
export async function convertToMp4(blob: Blob): Promise<string> {
  const body = new FormData();
  body.append('file', blob, 'video.webm');
  const r = await fetch(`${SERVER}/export/mp4`, { method: 'POST', body });
  if (!r.ok) throw new Error((await errorFrom(r)).message);
  const j = await r.json();
  const mp4 = await fetch(`${SERVER}${j.url}`);
  return URL.createObjectURL(await mp4.blob());
}
