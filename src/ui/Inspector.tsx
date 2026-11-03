import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { totalDuration, useStore, formatTime } from '../store';
import { getRuntimeError } from '../scene/runtime';
import { ManimPanel } from './ManimPanel';
import { editorTheme } from './editorTheme';

const extensions = [javascript(), ...editorTheme];

const ASPECTS: { label: string; r: number }[] = [
  { label: '16:9', r: 9 / 16 },
  { label: '9:16', r: 16 / 9 },
  { label: '1:1', r: 1 },
  { label: '4:3', r: 3 / 4 },
];

export function Inspector() {
  const frame = useStore((s) => s.frames.find((f) => f.id === s.selectedId) ?? null);
  const update = useStore((s) => s.updateFrame);
  const remove = useStore((s) => s.removeFrame);
  const duplicate = useStore((s) => s.duplicateFrame);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!frame) return;
    const id = setInterval(() => setErr(getRuntimeError(frame.id)), 250);
    return () => clearInterval(id);
  }, [frame?.id]);

  const onCode = useMemo(() => (v: string) => frame && update(frame.id, { code: v }), [frame?.id, update]);

  if (!frame) return <ProjectInfo />;

  const num = (k: 'x' | 'y' | 'w' | 'h', label: string) => (
    <label className="input">
      <i>{label}</i>
      <input
        className="num"
        inputMode="numeric"
        value={frame[k]}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) update(frame.id, { [k]: v });
        }}
      />
    </label>
  );

  return (
    <aside className="inspector" aria-label="Inspetor">
      <div className="panel-head">
        Frame
        <span style={{ display: 'flex', gap: 2 }}>
          <button className="icon-btn" aria-label="Duplicar frame" title="Duplicar  Ctrl+D" onClick={() => duplicate(frame.id)}>
            <Copy size={15} strokeWidth={1.75} />
          </button>
          <button className="icon-btn" aria-label="Excluir frame" title="Excluir  Delete" onClick={() => remove(frame.id)}>
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </span>
      </div>
      <div className="fields">
        <div className="row">
          <span>Nome</span>
          <label className="input">
            <input value={frame.name} onChange={(e) => update(frame.id, { name: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <span>Duração</span>
          <label className="input">
            <input
              className="num"
              type="number"
              min={0.5}
              step={0.5}
              value={frame.duration}
              onChange={(e) => update(frame.id, { duration: Math.max(0.5, Number(e.target.value) || 0.5) })}
            />
            <i style={{ paddingRight: 10, width: 'auto' }}>s</i>
          </label>
        </div>
        <div className="row">
          <span>Posição</span>
          <div className="grid2">
            {num('x', 'X')}
            {num('y', 'Y')}
          </div>
        </div>
        <div className="row">
          <span>Tamanho</span>
          <div className="grid2">
            {num('w', 'L')}
            {num('h', 'A')}
          </div>
        </div>
        <div className="row">
          <span>Formato</span>
          <div className="chips">
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                className="chip"
                aria-pressed={Math.abs(frame.h / frame.w - a.r) < 0.01}
                onClick={() => update(frame.id, { h: Math.round(frame.w * a.r) })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {frame.kind === 'manim' ? (
        <ManimPanel frame={frame} onCode={onCode} />
      ) : (
        <>
        <div className="code-head">
          Código da cena
          <span className="lang">(ctx, t, w, h, lib) =&gt; void</span>
        </div>
        <div className="code">
          <CodeMirror value={frame.code} onChange={onCode} extensions={extensions} theme="none" basicSetup={{ foldGutter: false, highlightActiveLine: true }} height="100%" />
        </div>
        {err ? (
          <div className="err" role="alert">
            <AlertTriangle size={14} style={{ flex: 'none', marginTop: 2 }} />
            {err}
          </div>
        ) : (
          <div className="ok">
            <span className="dot" /> Rodando ao vivo no canvas
          </div>
        )}
        </>
      )}
    </aside>
  );
}

function ProjectInfo() {
  const frames = useStore((s) => s.frames);
  return (
    <aside className="inspector" aria-label="Inspetor">
      <div className="panel-head">Projeto</div>
      <div className="empty">
        <div className="stats">
          <div>
            <b>{frames.length}</b>
            <span>cenas</span>
          </div>
          <div>
            <b>{formatTime(totalDuration(frames))}</b>
            <span>duração</span>
          </div>
          <div>
            <b>1080p</b>
            <span>saída</span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <h2>Selecione um frame para editar</h2>
          <p>Cada frame é uma janela do canvas. O código dele desenha a cena em função do tempo <code className="num">t</code>, e a ordem na lista é a ordem do vídeo.</p>
        </div>
        <ul className="keys">
          <li><span>Tocar / pausar</span><span><kbd>Espaço</kbd></span></li>
          <li><span>Desenhar frame</span><span><kbd>F</kbd></span></li>
          <li><span>Frame vertical (Shorts)</span><span><kbd>Shift</kbd><kbd>arrastar</kbd></span></li>
          <li><span>Mover a vista</span><span><kbd>H</kbd></span></li>
          <li><span>Zoom</span><span><kbd>Ctrl</kbd><kbd>scroll</kbd></span></li>
          <li><span>Ver tudo</span><span><kbd>Shift</kbd><kbd>1</kbd></span></li>
          <li><span>Focar no frame</span><span><kbd>Shift</kbd><kbd>2</kbd></span></li>
          <li><span>Apresentar</span><span><kbd>P</kbd></span></li>
        </ul>
      </div>
    </aside>
  );
}
