import { Hand, MousePointer2, Frame as FrameIcon, Maximize, MonitorPlay, Download } from 'lucide-react';
import { useStore, type Tool } from '../store';
import { fitAll, flyTo } from '../canvas/camera';

const tools: { id: Tool; label: string; key: string; icon: React.ReactNode }[] = [
  { id: 'select', label: 'Selecionar', key: 'V', icon: <MousePointer2 size={15} strokeWidth={1.75} /> },
  { id: 'hand', label: 'Mover a vista', key: 'H', icon: <Hand size={15} strokeWidth={1.75} /> },
  { id: 'frame', label: 'Desenhar frame (Shift: 9:16)', key: 'F', icon: <FrameIcon size={15} strokeWidth={1.75} /> },
];

export function Topbar({ onExport }: { onExport: () => void }) {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const zoom = useStore((s) => s.camera.zoom);
  const setPresenting = useStore((s) => s.setPresenting);

  return (
    <header className="topbar">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 18 18" aria-hidden>
          <rect x="1.5" y="4.5" width="11" height="11" rx="1.5" fill="none" stroke="#8b7cf6" strokeWidth="1.5" />
          <rect x="5.5" y="1.5" width="11" height="11" rx="1.5" fill="#8b7cf6" fillOpacity="0.25" stroke="#b4a9ff" strokeWidth="1.5" />
        </svg>
        Frame
      </div>
      <div className="crumb">
        <span>/</span>
        <strong>Episódio 1 · Números complexos</strong>
      </div>
      <div className="spacer" />
      <div className="seg" role="toolbar" aria-label="Ferramentas">
        {tools.map((t) => (
          <button key={t.id} aria-pressed={tool === t.id} title={`${t.label}  ${t.key}`} aria-label={t.label} onClick={() => setTool(t.id)}>
            {t.icon}
          </button>
        ))}
      </div>
      <button className="icon-btn" title="Ver tudo  Shift+1" aria-label="Ver tudo" onClick={() => flyTo(fitAll(useStore.getState().frames))}>
        <Maximize size={15} strokeWidth={1.75} />
      </button>
      <span className="zoom num">{Math.round(zoom * 100)}%</span>
      <div className="spacer" />
      <ServicePill />
      <button className="btn ghost" onClick={() => setPresenting(true)} title="Apresentar  P">
        <MonitorPlay size={15} strokeWidth={1.75} /> Apresentar
      </button>
      <button className="btn primary" onClick={onExport}>
        <Download size={15} strokeWidth={2} /> Exportar vídeo
      </button>
    </header>
  );
}

function ServicePill() {
  const server = useStore((s) => s.server);
  const on = server.status === 'online';
  const title = on
    ? `Serviço local conectado · Manim ${server.manim ?? 'não instalado'} · FFmpeg ${server.ffmpeg ? 'ok' : 'ausente'}`
    : 'Serviço local desligado. Rode "npm run server" na pasta do projeto para usar Manim e exportar MP4.';
  return (
    <span className="svc" data-on={on} title={title} role="status">
      <span className="dot" /> {server.status === 'checking' ? 'Serviço…' : on ? 'Serviço local' : 'Serviço offline'}
    </span>
  );
}
