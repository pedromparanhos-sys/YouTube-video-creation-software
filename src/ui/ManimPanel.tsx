import { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { AlertTriangle, Loader2, Play } from 'lucide-react';
import { useStore, type Frame } from '../store';
import { renderManim, type Quality } from '../service/api';
import { editorTheme } from './editorTheme';

const QUALITIES: { id: Quality; label: string }[] = [
  { id: 'preview', label: '480p' },
  { id: 'hd', label: '720p' },
  { id: 'full', label: '1080p' },
];

export function ManimPanel({ frame, onCode }: { frame: Frame; onCode: (v: string) => void }) {
  const server = useStore((s) => s.server);
  const [quality, setQuality] = useState<Quality>('preview');
  const [fit, setFit] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const r = frame.render;
  const busy = r?.status === 'rendering';
  const online = server.status === 'online' && !!server.manim;

  const run = () => {
    const f = useStore.getState().frames.find((x) => x.id === frame.id);
    if (f && online && f.render?.status !== 'rendering') renderManim(f, quality, fit);
  };

  // Ctrl/Cmd+Enter renders from inside the editor
  const extensions = useMemo(
    () => [python(), ...editorTheme, Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (run(), true) }]))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frame.id, quality, fit, online],
  );

  const stale = r?.status === 'done' && r.code !== frame.code;

  return (
    <>
      <div className="code-head">
        Código Manim
        <span className="lang">Python · class …(Scene)</span>
      </div>
      <div className="code">
        <CodeMirror value={frame.code} onChange={onCode} extensions={extensions} theme="none" basicSetup={{ foldGutter: false }} height="100%" />
      </div>
      <div className="render-bar">
        <div className="chips" role="radiogroup" aria-label="Qualidade">
          {QUALITIES.map((q) => (
            <button key={q.id} className="chip" role="radio" aria-checked={quality === q.id} aria-pressed={quality === q.id} onClick={() => setQuality(q.id)}>
              {q.label}
            </button>
          ))}
        </div>
        <label className="check" title="Ajusta a duração do clipe para a do vídeo renderizado">
          <input type="checkbox" checked={fit} onChange={(e) => setFit(e.target.checked)} /> Ajustar duração
        </label>
        <button className="btn primary" disabled={!online || busy} onClick={run} title="Ctrl+Enter">
          {busy ? <Loader2 size={14} className="spin" /> : <Play size={13} fill="currentColor" strokeWidth={0} />}
          {busy ? 'Renderizando' : 'Renderizar'}
        </button>
      </div>
      {!online ? (
        <div className="err" role="status">
          <AlertTriangle size={14} style={{ flex: 'none', marginTop: 2 }} />
          <span>
            {server.status === 'checking'
              ? 'Procurando o serviço local…'
              : server.status === 'online'
                ? 'O serviço local está rodando, mas sem Manim. Instale com: pip install -r server/requirements.txt'
                : 'Serviço local desligado. Na pasta do projeto, rode: npm run server'}
          </span>
        </div>
      ) : r?.status === 'error' ? (
        <div className="err" role="alert" style={{ display: 'grid', gap: 6 }}>
          <span style={{ display: 'flex', gap: 8 }}>
            <AlertTriangle size={14} style={{ flex: 'none', marginTop: 2 }} />
            {r.error}
          </span>
          {r.log && (
            <>
              <button className="linkish" onClick={() => setShowLog((v) => !v)}>
                {showLog ? 'Esconder log' : 'Ver log do Manim'}
              </button>
              {showLog && <pre className="log">{r.log}</pre>}
            </>
          )}
        </div>
      ) : (
        <div className="ok">
          <span className="dot" style={stale || !r?.url ? { background: 'var(--amber)' } : undefined} />
          {busy
            ? 'Renderizando no serviço local…'
            : stale
              ? 'O código mudou desde a última renderização'
              : r?.url
                ? `Vídeo pronto${r.duration ? ` · ${r.duration.toFixed(1)}s` : ''}`
                : 'Ainda não renderizada · Ctrl+Enter'}
        </div>
      )}
    </>
  );
}
