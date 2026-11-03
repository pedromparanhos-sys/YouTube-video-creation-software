# Contexto do projeto Frame (para continuar em uma nova sessão)

Você vai continuar o desenvolvimento do **Frame**, um software para criar vídeos do YouTube. Este documento resume tudo o que já foi decidido e construído. Leia-o inteiro antes de mexer no código, depois leia `README.md`, `PRODUCT.md` e `DESIGN.md`.

## Quem é o usuário

Pedro, criador técnico de vídeos para o YouTube. Programa em Python e JS e quer fazer vídeos explicativos no estilo 3Blue1Brown: animações, gráficos, visualização de dados, simulações físicas, diagramas de orquestração de IA. Usa **Windows** (PC `DESKTOP-VDVM8PO`). Fala português; responda em português.

## A ideia do produto

Um software de apresentação e de vídeo em que **toda cena é programável**:

- **Canvas infinito.** O usuário marca retângulos do canvas como **frames** do vídeo. A ordem dos frames é a ordem do vídeo.
- **Cada cena é uma função do tempo `t`.** A regra é renderizar, não gravar; só o que é humano (voz, webcam) é gravado.
- **Integrar as melhores ferramentas em vez de recriá-las:** Manim (Python), Blender (`blender -b` + `bpy`), FFmpeg e Whisper.
- Primeiro é uma ferramenta poderosa para o próprio Pedro; depois vira produto para outros criadores.

## Stack e arquitetura

- **Editor:** React 19 + TypeScript + Vite, com estado em zustand e editor de código CodeMirror 6. Vai virar app desktop com **Tauri** mais tarde.
- **Serviço local:** Python + FastAPI na porta **8765**, em `server/main.py`.
  - `GET /health`
  - `POST /manim/render`: recebe `{code, scene?, quality: preview|hd|full, aspect}` e devolve `{url, duration, ...}`.
  - `POST /export/mp4`: recebe um upload WebM e devolve um MP4 H.264.
  - `GET /media/{id}.mp4`
- O editor detecta o serviço sozinho (`src/service/api.ts`, endereço configurável em `VITE_FRAME_SERVER`).

## Estrutura do código

| Caminho | O que é |
|---|---|
| `src/store.ts` | Estado global: frames (`kind: 'js' \| 'manim'`, `code`, `render`, posição, tamanho, duração), câmera, tempo, playback, status do serviço. Salva no `localStorage` (`frame-editor/v1`). |
| `src/canvas/InfiniteCanvas.tsx` | Canvas 2D: pan/zoom, grade de prancheta, frames, rota entre frames, câmera que voa entre frames durante o play. |
| `src/canvas/camera.ts` | Funções `fitFrame`, `fitAll`, `flyTo` e `interp` (interpolação com arco de zoom). |
| `src/scene/runtime.ts` | Compila o código JS da cena com `new Function` e expõe a `lib` (`ease`, `span`, `text`, `axes`, `plot`, `voxel`, `colors`, ...). |
| `src/scene/frameContent.ts` | Desenha qualquer frame: JS ou vídeo Manim. Usa um `<video>` por canal (`editor`/`output`) para os relógios não brigarem. |
| `src/scene/render.ts` | Renderiza o vídeo final e exporta em WebM via MediaRecorder, em tempo real. |
| `src/scene/samples.ts` | Cenas de exemplo: título, seno/cosseno, onda de pêndulos, terreno em voxels, círculo unitário em Manim. |
| `src/ui/*` | Topbar, Sidebar (lista de cenas), Inspector (propriedades + código), ManimPanel, Timeline, `editorTheme.ts`. |
| `server/` | Serviço FastAPI e `requirements.txt` (`manim==0.19.0`, `fastapi`, `uvicorn`, `python-multipart`). |

## O que já funciona

- Canvas infinito: pan, zoom, criar frame (`F`; `Shift` para 9:16 Shorts), mover e redimensionar frames.
- Cenas JS ao vivo no canvas, com mensagem de erro.
- Linha do tempo: clipes arrastáveis pela borda para mudar a duração, playhead com scrub.
- Play (`Espaço`) com a câmera voando pela rota de um frame ao próximo.
- Apresentação (`P`) e exportação em WebM 1080p30.
- Cenas Manim: editor Python, Renderizar (`Ctrl+Enter`), qualidade 480p/720p/1080p, ajuste automático de duração, log de erro e aviso de "código alterado".
- Conversão para MP4 pelo FFmpeg.

O fluxo inteiro foi testado de ponta a ponta no Linux (Playwright + Manim 0.19) e no **Windows 10** do Pedro (3/11/2026: Node 26, Python 3.13, Manim 0.19, FFmpeg 9 via winget, MiKTeX).

## Design (veja `DESIGN.md`)

O visual foi definido pelo Pedro, com referências escolhidas por ele:
- **Linear (interface do app):** escuro, denso, silencioso.
- **Palantir (ilustrações técnicas isométricas):** grade de prancheta, violeta e azul.

Elementos:
- **Cores:** fundo `#0c0d10`. Violeta `#8b7cf6` para seleção, ação principal e rota. Azul `#5ea3ff` para playhead e tempo. Menta `#7ee2b8` para "ao vivo" e renderização. Âmbar `#f5c26b` para estado desatualizado. Vermelho `#ff6b6b` para erro e gravação.
- **Fontes:** Inter Variable na interface; JetBrains Mono só para código, timecodes e números.
- **Assinatura visual:** a câmera percorre a rota tracejada entre os frames durante o play.

**Skills de design instaladas:** Impeccable (dona do design system: `PRODUCT.md`, `DESIGN.md`, `.impeccable/`), frontend-design, UI UX Pro Max, Taste Skill. Use a Impeccable para revisar, criticar e polir telas novas. As outras servem para refinar telas específicas.

## Estado do repositório

- GitHub: `pedromparanhos-sys/youtube-video-creation-software`.
- O `main` tem o MVP (PR #1, já mesclado).
- O serviço Manim/MP4 (`feat/python-service`, PR #2) já foi mesclado no `main`.
- Sempre faça commit e push do trabalho para não perder nada. Trabalhe em branches e faça PR para o `main`.

## Windows: como rodar e o que foi corrigido

- FFmpeg: `winget install Gyan.FFmpeg` (abrir terminal novo depois).
- `python -m venv .venv` e `.venv\Scripts\python -m pip install -r server/requirements.txt`.
- `npm run dev` e, em outro terminal, `npm run server` (é o mesmo que `server:win`). O script `scripts/server.mjs` usa o Python do `.venv` sem precisar ativar e faz o próprio reload ao mudar `server/*.py`.
- Correções feitas:
  - `asyncio.create_subprocess_exec` dava `NotImplementedError` no Windows (o uvicorn usa SelectorEventLoop). Agora os subprocessos rodam com `subprocess.run` numa thread (`run()` em `server/main.py`).
  - O `uvicorn --reload` no Windows reinicia com `CTRL_C_EVENT`, que derruba todo o console (npm junto). O reload agora é feito pelo `scripts/server.mjs`.
  - O subprocesso do Manim recebe `PYTHONIOENCODING=utf-8` e `COLUMNS=160` (o console do Windows é cp1252 e o rich quebrava o log em 80 colunas).

## Próximos passos (em ordem sugerida)

1. **Gravação de voz e webcam por cena** (o principal agora):
   - Gravar no navegador (`getUserMedia` / MediaRecorder) por frame, regravar só um trecho e sobrepor a webcam no vídeo.
   - Incluir o áudio na exportação; hoje a exportação não tem áudio, e o FFmpeg usa `-an`.
2. **Legendas automáticas e tempos das palavras com Whisper** no serviço local. Ideia-chave: animações disparadas quando o narrador fala certas palavras, além de corte automático de silêncios.
3. **Voxel 3D com física** (Three.js): modelar em 3D por código e simular física sobre os voxels. Já existe um voxel isométrico 2D em `lib.voxel`.
4. **Ponte com o Blender:** abrir um `.blend`, trocar parâmetros por script, renderizar e importar o resultado.
5. Mais tarde:
   - Exportação mais rápida que o tempo real, renderizando quadro a quadro com WebCodecs ou no serviço.
   - LaTeX/`MathTex`, blocos de código com diff animado, gráficos ligados a dados reais.
   - Teleprompter e capítulos do YouTube gerados a partir das cenas.
   - Exportar 16:9 e 9:16 ao mesmo tempo, upload pela API do YouTube.
   - Tauri.

## Limitações conhecidas

- A exportação roda em tempo real e sai sem áudio.
- `MathTex` precisa de LaTeX instalado.
- O projeto fica só no `localStorage` do navegador. Ainda não há arquivo de projeto salvo em disco; isso seria um bom próximo passo, junto com o Tauri.
