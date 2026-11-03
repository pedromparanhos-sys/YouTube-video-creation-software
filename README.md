# Frame

Editor de vídeos para o YouTube em que cada cena é programável. Você monta as cenas num **canvas infinito**, marca retângulos dele como **frames do vídeo**, anima cada frame com código em função do tempo `t`, e exporta.

## Rodar o editor

Precisa do [Node.js 22](https://nodejs.org).

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

## Rodar o serviço local (Manim + MP4)

O editor funciona sozinho; o serviço Python é o que renderiza cenas **Manim** e converte a exportação para **MP4**. Precisa de Python 3.10+ e do [FFmpeg](https://ffmpeg.org/download.html) no PATH. O Manim tem um guia de instalação por sistema em https://docs.manim.community/en/stable/installation.html (no Linux, instale antes `libcairo2-dev` e `libpango1.0-dev`; `MathTex` exige LaTeX, como o MiKTeX no Windows).

No Windows, o FFmpeg se instala com `winget install Gyan.FFmpeg` (abra um terminal novo depois, para o PATH atualizar).

Primeira vez, na pasta do projeto:

```bash
python -m venv .venv
```

Instale as dependências com o Python do ambiente (Windows: `.venv\Scripts\python -m pip ...` · macOS/Linux: `.venv/bin/python -m pip ...`):

```bash
.venv/bin/python -m pip install -r server/requirements.txt
```

Depois, em um segundo terminal:

```bash
npm run server
```

O script usa o Python do `.venv` sozinho (não precisa ativar o ambiente) e reinicia o serviço quando um arquivo de `server/` muda. Funciona igual no Windows, macOS e Linux; `npm run server:win` continua existindo como sinônimo. O selo **Serviço local** no topo do editor fica verde quando ele está conectado (porta 8765).

## O que já funciona (MVP)

- Canvas infinito com pan (arrastar no vazio, `H`, botão do meio, scroll) e zoom (`Ctrl`+scroll / pinça).
- Ferramenta Frame (`F`): arraste para desenhar um frame 16:9; com `Shift`, 9:16 para Shorts.
- Mover e redimensionar frames (canto inferior direito; `Alt` libera a proporção).
- Cada frame tem código JS: `function (ctx, t, w, h, lib)`. A cena roda ao vivo no canvas.
- Linha do tempo: clipes na ordem do vídeo, playhead arrastável, duração ajustável pela borda do clipe.
- Na reprodução (`Espaço`), a câmera voa pela rota de um frame ao próximo.
- Modo apresentação (`P`) em tela cheia.
- Exportar em WebM 1920×1080 a 30fps (no navegador, em tempo real) e converter para MP4 (H.264) pelo serviço local.
- Cenas **Manim (Python)**: escreva a `Scene`, clique em Renderizar (`Ctrl+Enter`), e o vídeo entra no frame, sincronizado com a linha do tempo. A duração do clipe se ajusta ao vídeo.

## API das cenas (`lib`)

`clamp`, `lerp`, `ease.{linear,in,out,inOut}`, `span(t, início, duração, ease)`, `colors`, `text(ctx, s, x, y, opts)`, `axes(...)`, `plot(...)`, `voxel(ctx, ox, oy, gx, gy, gz, tamanho, cor)`, `shade`, `rand(seed)`.

## Próximos passos

1. Gravação de voz e webcam por cena; legendas com Whisper.
2. Cenas **voxel 3D** (Three.js) com física.
3. Ponte com o **Blender** (`blender -b` + `bpy`).
4. Empacotar como app desktop com Tauri.
