import { useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { InfiniteCanvas } from './canvas/InfiniteCanvas';
import { fitAll, fitFrame, flyTo } from './canvas/camera';
import { Topbar } from './ui/Topbar';
import { Sidebar } from './ui/Sidebar';
import { Inspector } from './ui/Inspector';
import { Timeline } from './ui/Timeline';
import { formatTime, totalDuration, useStore } from './store';
import { exportVideo, renderVideoFrame } from './scene/render';
import { convertToMp4, useServerHealth } from './service/api';

function usePlaybackClock() {
  const playing = useStore((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = useStore.getState();
      const total = totalDuration(s.frames);
      const next = s.time + (now - last) / 1000;
      last = now;
      if (next >= total) {
        s.setTime(total);
        s.setPlaying(false);
        return;
      }
      s.setTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || !!t.closest('.cm-editor'));

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (e.key === 'Escape') {
        if (s.presenting) s.setPresenting(false);
        else if (isTyping(e.target)) (e.target as HTMLElement).blur();
        else s.select(null);
        return;
      }
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space') {
        e.preventDefault();
        if (!s.playing && s.time >= totalDuration(s.frames) - 0.01) s.setTime(0);
        s.setPlaying(!s.playing);
      } else if ((e.metaKey || e.ctrlKey) && k === 'd') {
        e.preventDefault();
        if (s.selectedId) s.duplicateFrame(s.selectedId);
      } else if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      } else if (k === 'v') s.setTool('select');
      else if (k === 'h') s.setTool('hand');
      else if (k === 'f') s.setTool('frame');
      else if (k === 'p') s.setPresenting(true);
      else if (e.key === 'Home') s.setTime(0);
      else if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) s.removeFrame(s.selectedId);
      else if (e.shiftKey && e.code === 'Digit1') flyTo(fitAll(s.frames));
      else if (e.shiftKey && e.code === 'Digit2') {
        const f = s.frames.find((x) => x.id === s.selectedId);
        if (f) flyTo(fitFrame(f));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function Present() {
  const ref = useRef<HTMLCanvasElement>(null);
  const playing = useStore((s) => s.playing);
  const time = useStore((s) => s.time);
  const total = useStore((s) => totalDuration(s.frames));
  useEffect(() => {
    const s = useStore.getState();
    if (s.time >= total - 0.01) s.setTime(0);
    s.setPlaying(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    let raf = 0;
    const loop = () => {
      const st = useStore.getState();
      const c = ref.current;
      if (c) renderVideoFrame(c.getContext('2d')!, st.frames, st.time, c.width, c.height, st.playing);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onFs = () => !document.fullscreenElement && useStore.getState().setPresenting(false);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      useStore.getState().setPlaying(false);
    };
  }, []);
  const s = useStore.getState();
  return (
    <div className="present" role="dialog" aria-label="Apresentação">
      <canvas ref={ref} width={1920} height={1080} />
      <div className="bar">
        <button className="icon-btn" aria-label={playing ? 'Pausar' : 'Tocar'} onClick={() => s.setPlaying(!playing)}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <span className="tc">{formatTime(time)} <span>/ {formatTime(total)}</span></span>
        <button className="icon-btn" aria-label="Sair da apresentação" onClick={() => s.setPresenting(false)}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<'running' | 'done' | 'error'>('running');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mp4, setMp4] = useState<{ state: 'idle' | 'working' | 'done' | 'error'; url?: string; error?: string }>({ state: 'idle' });
  const server = useStore((s) => s.server);
  const canMp4 = server.status === 'online' && server.ffmpeg;
  const cancel = useRef<() => void>(() => {});
  useEffect(() => {
    cancel.current = exportVideo(useStore.getState().frames, setProgress, (blob, error) => {
      if (error) {
        setState('error');
        setMessage(error);
      } else if (blob) {
        setBlob(blob);
        setUrl(URL.createObjectURL(blob));
        setState('done');
      }
    });
    return () => cancel.current();
  }, []);
  const total = totalDuration(useStore.getState().frames);
  return (
    <div className="scrim">
      <div className="dialog" role="dialog" aria-labelledby="exp-title">
        <h2 id="exp-title">{state === 'done' ? 'Vídeo pronto' : state === 'error' ? 'Não foi possível exportar' : 'Exportando vídeo'}</h2>
        {state === 'running' && (
          <>
            <p>Renderizando em tempo real a 1920×1080, 30fps. Leva {formatTime(total)}; mantenha esta aba aberta.</p>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${progress * 100}%` }} /></div>
            <p className="num" style={{ fontSize: 12 }}>{Math.round(progress * 100)}%</p>
          </>
        )}
        {state === 'done' && (
          <p>
            {mp4.state === 'done'
              ? 'MP4 (H.264) pronto para o YouTube.'
              : mp4.state === 'working'
                ? 'Convertendo para MP4 com o FFmpeg…'
                : mp4.state === 'error'
                  ? `Falha na conversão: ${mp4.error}`
                  : canMp4
                    ? 'WebM gerado. Converta para MP4 (H.264), o formato recomendado pelo YouTube.'
                    : 'WebM gerado. Para converter em MP4, ligue o serviço local (npm run server).'}
          </p>
        )}
        {state === 'error' && <p>{message}</p>}
        <div className="actions">
          <button className="btn ghost" onClick={onClose}>{state === 'running' ? 'Cancelar' : 'Fechar'}</button>
          {url && (
            <a className={`btn ${canMp4 ? '' : 'primary'}`} href={url} download="video.webm" style={{ textDecoration: 'none' }}>
              Baixar .webm
            </a>
          )}
          {blob && canMp4 && mp4.state !== 'done' && (
            <button
              className="btn primary"
              disabled={mp4.state === 'working'}
              onClick={async () => {
                setMp4({ state: 'working' });
                try {
                  setMp4({ state: 'done', url: await convertToMp4(blob) });
                } catch (e) {
                  setMp4({ state: 'error', error: (e as Error).message });
                }
              }}
            >
              {mp4.state === 'working' ? 'Convertendo…' : 'Converter para MP4'}
            </button>
          )}
          {mp4.url && (
            <a className="btn primary" href={mp4.url} download="video.mp4" style={{ textDecoration: 'none' }}>
              Baixar .mp4
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  usePlaybackClock();
  useShortcuts();
  useServerHealth();
  const presenting = useStore((s) => s.presenting);
  const [exporting, setExporting] = useState(false);
  const tool = useStore((s) => s.tool);

  return (
    <div className="app">
      <Topbar onExport={() => setExporting(true)} />
      <Sidebar />
      <div style={{ gridArea: 'canvas', position: 'relative', minWidth: 0, minHeight: 0 }}>
        <InfiniteCanvas />
        {tool === 'frame' && <div className="hint">Arraste para desenhar um frame 16:9 · Shift para 9:16 · clique para 1920×1080</div>}
      </div>
      <Inspector />
      <Timeline />
      {presenting && <Present />}
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
    </div>
  );
}
