import { create } from 'zustand';
import { SAMPLE_BLANK, SAMPLE_MANIM, SAMPLE_PHYSICS, SAMPLE_PLOT, SAMPLE_TITLE, SAMPLE_VOXEL } from './scene/samples';

export type FrameKind = 'js' | 'manim';

/** Result of the last Manim render for a frame. */
export type RenderInfo = {
  status: 'idle' | 'rendering' | 'done' | 'error';
  url?: string; // absolute URL served by the local service
  duration?: number;
  error?: string;
  log?: string;
  code?: string; // python source that produced `url`
};

export type Frame = {
  id: string;
  kind: FrameKind;
  render?: RenderInfo;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  duration: number;
  code: string;
};

export type ServerStatus =
  | { status: 'checking' }
  | { status: 'offline' }
  | { status: 'online'; manim: string | null; ffmpeg: boolean };

export type Tool = 'select' | 'hand' | 'frame';
export type Camera = { x: number; y: number; zoom: number }; // world point at screen origin, px per world unit

type State = {
  frames: Frame[];
  selectedId: string | null;
  tool: Tool;
  camera: Camera;
  time: number;
  playing: boolean;
  presenting: boolean;
  exporting: number | null; // 0..1 progress
  server: ServerStatus;
  setServer: (s: ServerStatus) => void;
  setTool: (t: Tool) => void;
  setCamera: (c: Camera) => void;
  select: (id: string | null) => void;
  updateFrame: (id: string, patch: Partial<Frame>) => void;
  addFrame: (f?: Partial<Frame>) => string;
  removeFrame: (id: string) => void;
  duplicateFrame: (id: string) => void;
  moveFrame: (id: string, dir: -1 | 1) => void;
  setTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setPresenting: (p: boolean) => void;
  setExporting: (p: number | null) => void;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const FW = 1920;
const FH = 1080;

const initialFrames: Frame[] = [
  { id: uid(), kind: 'js', name: 'Abertura', x: 0, y: 0, w: FW, h: FH, duration: 4, code: SAMPLE_TITLE },
  { id: uid(), kind: 'js', name: 'Seno e cosseno', x: 2400, y: 300, w: FW, h: FH, duration: 6, code: SAMPLE_PLOT },
  { id: uid(), kind: 'js', name: 'Onda de pêndulos', x: 4700, y: -200, w: FW, h: FH, duration: 8, code: SAMPLE_PHYSICS },
  { id: uid(), kind: 'js', name: 'Terreno em voxels', x: 2600, y: 1900, w: FW, h: FH, duration: 6, code: SAMPLE_VOXEL },
  { id: uid(), kind: 'manim', name: 'Círculo unitário (Manim)', x: 5000, y: 1700, w: FW, h: FH, duration: 6, code: SAMPLE_MANIM },
];

const STORAGE_KEY = 'frame-editor/v1';

function load(): Frame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Frame[];
      if (Array.isArray(parsed) && parsed.length)
        // older saves have no kind; a render left mid-flight cannot resume after reload
        return parsed.map((f) => ({
          ...f,
          kind: f.kind ?? 'js',
          render: f.render?.status === 'rendering' ? { ...f.render, status: 'idle' } : f.render,
        }));
    }
  } catch {
    /* storage unavailable */
  }
  return initialFrames;
}

export const useStore = create<State>((set, get) => ({
  frames: load(),
  selectedId: null,
  tool: 'select',
  camera: { x: -300, y: -500, zoom: 0.18 },
  time: 2.6, // opens mid-title so the first frame is not blank
  playing: false,
  presenting: false,
  exporting: null,
  server: { status: 'checking' },
  setServer: (server) => set({ server }),
  setTool: (tool) => set({ tool }),
  setCamera: (camera) => set({ camera }),
  select: (selectedId) => set({ selectedId }),
  updateFrame: (id, patch) =>
    set({ frames: get().frames.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),
  addFrame: (f = {}) => {
    const frames = get().frames;
    const last = frames[frames.length - 1];
    const id = uid();
    const frame: Frame = {
      id,
      name: `Cena ${frames.length + 1}`,
      x: last ? last.x + last.w + 400 : 0,
      y: last ? last.y : 0,
      w: FW,
      h: FH,
      duration: 4,
      kind: 'js',
      ...f,
      code: f.code ?? (f.kind === 'manim' ? SAMPLE_MANIM : SAMPLE_BLANK),
    };
    set({ frames: [...frames, frame], selectedId: id });
    return id;
  },
  removeFrame: (id) => {
    const frames = get().frames.filter((f) => f.id !== id);
    set({ frames, selectedId: get().selectedId === id ? null : get().selectedId });
  },
  duplicateFrame: (id) => {
    const src = get().frames.find((f) => f.id === id);
    if (!src) return;
    const copy = { ...src, id: uid(), name: `${src.name} (cópia)`, x: src.x + 160, y: src.y + 160 };
    const frames = [...get().frames];
    frames.splice(frames.indexOf(src) + 1, 0, copy);
    set({ frames, selectedId: copy.id });
  },
  moveFrame: (id, dir) => {
    const frames = [...get().frames];
    const i = frames.findIndex((f) => f.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= frames.length) return;
    [frames[i], frames[j]] = [frames[j], frames[i]];
    set({ frames });
  },
  setTime: (time) => set({ time: Math.max(0, Math.min(totalDuration(get().frames), time)) }),
  setPlaying: (playing) => set({ playing }),
  setPresenting: (presenting) => set({ presenting }),
  setExporting: (exporting) => set({ exporting }),
}));

useStore.subscribe((s, prev) => {
  if (s.frames === prev.frames) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s.frames));
  } catch {
    /* storage unavailable */
  }
});

export const totalDuration = (frames: Frame[]) => frames.reduce((a, f) => a + f.duration, 0);

/** Which frame the playhead is in, and the local time inside it. */
export function locate(frames: Frame[], time: number) {
  let acc = 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (time < acc + f.duration || i === frames.length - 1) {
      return { index: i, frame: f, local: Math.min(time - acc, f.duration), start: acc };
    }
    acc += f.duration;
  }
  return null;
}

export const frameStart = (frames: Frame[], id: string) => {
  let acc = 0;
  for (const f of frames) {
    if (f.id === id) return acc;
    acc += f.duration;
  }
  return 0;
};

export function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
