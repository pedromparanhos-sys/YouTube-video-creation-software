import { useEffect, useRef, useState } from 'react';
import { Plus, Code2, Sigma, Box, Mic, ChevronUp, ChevronDown } from 'lucide-react';
import { frameStart, locate, totalDuration, useStore, formatTime } from '../store';
import { fitFrame, flyTo } from '../canvas/camera';

export function Sidebar() {
  const frames = useStore((s) => s.frames);
  const selectedId = useStore((s) => s.selectedId);
  const time = useStore((s) => s.time);
  const select = useStore((s) => s.select);
  const addFrame = useStore((s) => s.addFrame);
  const moveFrame = useStore((s) => s.moveFrame);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = locate(frames, time)?.index ?? -1;

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);

  const focus = (id: string) => {
    const s = useStore.getState();
    select(id);
    s.setPlaying(false);
    s.setTime(frameStart(s.frames, id));
    const f = s.frames.find((x) => x.id === id);
    if (f) flyTo(fitFrame(f));
  };

  return (
    <aside className="sidebar" aria-label="Cenas">
      <div className="panel-head" style={{ position: 'relative' }}>
        Cenas
        <div ref={menuRef}>
          <button className="icon-btn" aria-label="Nova cena" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Plus size={16} strokeWidth={1.75} />
          </button>
          {menu && (
            <div className="menu" role="menu" style={{ left: 8, top: 38 }}>
              <button
                role="menuitem"
                onClick={() => {
                  const id = addFrame();
                  setMenu(false);
                  const f = useStore.getState().frames.find((x) => x.id === id);
                  if (f) flyTo(fitFrame(f));
                }}
              >
                <Code2 size={15} strokeWidth={1.75} /> Cena em código (JS) <span />
              </button>
              <button role="menuitem" disabled>
                <Sigma size={15} strokeWidth={1.75} /> Cena Manim (Python) <span className="soon">em breve</span>
              </button>
              <button role="menuitem" disabled>
                <Box size={15} strokeWidth={1.75} /> Voxel 3D e física <span className="soon">em breve</span>
              </button>
              <button role="menuitem" disabled>
                <Mic size={15} strokeWidth={1.75} /> Gravação de voz e webcam <span className="soon">em breve</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <ul className="scene-list" role="listbox" aria-label="Ordem do vídeo">
        {frames.map((f, i) => (
          <li
            key={f.id}
            role="option"
            aria-selected={selectedId === f.id}
            className="scene-item"
            onClick={() => focus(f.id)}
            title="Clique para ir até a cena"
          >
            {i === active && <span className="live" aria-hidden />}
            <span className="idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="name">{f.name}</span>
            {selectedId === f.id ? (
              <span style={{ display: 'flex' }}>
                <button className="icon-btn" style={{ width: 20, height: 22 }} aria-label="Mover para cima" disabled={i === 0} onClick={(e) => (e.stopPropagation(), moveFrame(f.id, -1))}>
                  <ChevronUp size={14} />
                </button>
                <button className="icon-btn" style={{ width: 20, height: 22 }} aria-label="Mover para baixo" disabled={i === frames.length - 1} onClick={(e) => (e.stopPropagation(), moveFrame(f.id, 1))}>
                  <ChevronDown size={14} />
                </button>
              </span>
            ) : (
              <span className="dur">{f.duration.toFixed(1)}s</span>
            )}
          </li>
        ))}
      </ul>
      <div className="side-foot">
        <div>
          <span>Duração total</span>
          <span className="num">{formatTime(totalDuration(frames))}</span>
        </div>
        <div>
          <span>Saída</span>
          <span className="num">1920×1080 · 30fps</span>
        </div>
      </div>
    </aside>
  );
}
