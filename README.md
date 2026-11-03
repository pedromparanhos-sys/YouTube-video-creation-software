# Frame

Editor de vídeos para o YouTube em que cada cena é programável. Você monta as cenas num **canvas infinito**, marca retângulos dele como **frames do vídeo**, anima cada frame com código em função do tempo `t`, e exporta.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

## O que já funciona (MVP)

- Canvas infinito com pan (arrastar no vazio, `H`, botão do meio, scroll) e zoom (`Ctrl`+scroll / pinça).
- Ferramenta Frame (`F`): arraste para desenhar um frame 16:9; com `Shift`, 9:16 para Shorts.
- Mover e redimensionar frames (canto inferior direito; `Alt` libera a proporção).
- Cada frame tem código JS: `function (ctx, t, w, h, lib)`. A cena roda ao vivo no canvas.
- Linha do tempo: clipes na ordem do vídeo, playhead arrastável, duração ajustável pela borda do clipe.
- Na reprodução (`Espaço`), a câmera voa pela rota de um frame ao próximo.
- Modo apresentação (`P`) em tela cheia.
- Exportar em WebM 1920×1080 a 30fps (no navegador, em tempo real).

## API das cenas (`lib`)

`clamp`, `lerp`, `ease.{linear,in,out,inOut}`, `span(t, início, duração, ease)`, `colors`, `text(ctx, s, x, y, opts)`, `axes(...)`, `plot(...)`, `voxel(ctx, ox, oy, gx, gy, gz, tamanho, cor)`, `shade`, `rand(seed)`.

## Próximos passos

1. Serviço Python local (FastAPI) para cenas **Manim** e exportação MP4 via **FFmpeg**.
2. Gravação de voz e webcam por cena; legendas com Whisper.
3. Cenas **voxel 3D** (Three.js) com física.
4. Ponte com o **Blender** (`blender -b` + `bpy`).
5. Empacotar como app desktop com Tauri.
