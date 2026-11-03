import { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack } from 'lucide-react';
import { formatTime, frameStart, totalDuration, useStore } from '../store';

export function Timeline() {
  const frames = useStore((s) => s.frames);
  const time = useStore((s) => s.time);
  const playing = useStore((s) => s.playing);
  const selectedId = useStore((s) => s.selectedId);
  const setTime = useStore((s) => s.setTime);
  const setPlaying = useStore((s) => s.setPlaying);
  const select = useStore((s) => s.select);
  const update = useStore((s) => s.updateFrame);
  const body = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [resizing, setResizing] = useState<string | null>(null);
  const total = Math.max(1, totalDuration(frames));

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width - 32));
    ro.observe(body.current!);
    return () => ro.disconnect();
  }, []);

  const pps = Math.max(24, width / total); // pixels per second
  const toTime = (clientX: number) => {
    const r = body.current!.getBoundingClientRect();
    return (clientX - r.left - 16 + body.current!.scrollLeft) / pps;
  };

  const scrub = (e: React.PointerEvent) => {
    setPlaying(false);
    setTime(toTime(e.clientX));
    const move = (ev: PointerEvent) => setTime(toTime(ev.clientX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startResize = (e: React.PointerEvent, id: string, start: number) => {
    e.stopPropagation();
    setResizing(id);
    const move = (ev: PointerEvent) => {
      const d = Math.max(0.5, Math.round((toTime(ev.clientX) - start) * 10) / 10);
      update(id, { duration: d });
    };
    const up = () => {
      setResizing(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const tickEvery = pps > 80 ? 1 : pps > 30 ? 2 : 5;
  const ticks = [];
  for (let s = 0; s <= total; s += tickEvery) ticks.push(s);

  return (
    <section className="timeline" aria-label="Linha do tempo">
      <div className="tl-head">
        <button className="icon-btn" aria-label="Voltar ao início" title="Início  Home" onClick={() => setTime(0)}>
          <SkipBack size={15} strokeWidth={1.75} />
        </button>
        <button className="play" aria-label={playing ? 'Pausar' : 'Tocar'} title="Espaço" onClick={() => {
          if (!playing && time >= total - 0.01) setTime(0);
          setPlaying(!playing);
        }}>
          {playing ? <Pause size={14} fill="currentColor" strokeWidth={0} /> : <Play size={14} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />}
        </button>
        <span className="tc">
          {formatTime(time)} <span>/ {formatTime(total)}</span>
        </span>
      </div>
      <div className="tl-body" ref={body}>
        <div className="tl-inner" style={{ width: total * pps }}>
          <div className="ruler" onPointerDown={scrub}>
            {ticks.map((s) => (
              <span key={s}>
                <span className="tick" style={{ left: s * pps, height: 8 }} />
                <span className="tick-label" style={{ left: s * pps }}>{s}s</span>
              </span>
            ))}
          </div>
          <div className="track">
            {frames.map((f) => {
              const start = frameStart(frames, f.id);
              return (
                <div
                  key={f.id}
                  className="clip"
                  role="button"
                  aria-selected={selectedId === f.id}
                  style={{ left: start * pps + 1, width: f.duration * pps - 2 }}
                  onPointerDown={(e) => {
                    select(f.id);
                    scrub(e);
                  }}
                >
                  <span className="cn">{f.name}</span>
                  <span className="cd">{f.duration.toFixed(1)}s</span>
                  <span className="kind">{f.kind === 'manim' ? 'MANIM' : 'JS'}</span>
                  <span
                    className={`grip ${resizing === f.id ? 'on' : ''}`}
                    title="Arraste para mudar a duração"
                    onPointerDown={(e) => startResize(e, f.id, start)}
                  />
                </div>
              );
            })}
          </div>
          <div className="playhead" style={{ left: time * pps }} />
        </div>
      </div>
    </section>
  );
}
