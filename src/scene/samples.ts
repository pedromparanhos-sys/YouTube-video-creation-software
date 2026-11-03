// Demo scenes. Every scene is the body of `function (ctx, t, w, h, lib)`.
// t = seconds since the scene started. w = 1920, h = scene height.

export const SAMPLE_TITLE = `// Título: o texto aparece letra por letra
const { text, span, colors, lerp } = lib;
const title = 'Por que e^(iπ) = −1?';
const n = Math.floor(span(t, 0.2, 1.6, lib.ease.linear) * title.length);

text(ctx, title.slice(0, n), w / 2, h / 2, {
  size: 120, weight: 600, align: 'center',
});

const k = span(t, 1.8, 0.8);
ctx.globalAlpha = k;
text(ctx, 'Uma visita guiada pelo círculo unitário', w / 2, h / 2 + lerp(110, 90, k), {
  size: 44, weight: 400, color: colors.dim, align: 'center',
});
`;

export const SAMPLE_PLOT = `// Gráfico estilo 3b1b: eixos, depois a curva se desenha
const { axes, plot, span, colors, text } = lib;

const grow = span(t, 0, 1.2);
const map = axes(ctx, w / 2, h / 2, 150, 150, {
  xRange: [-6, 6], yRange: [-3, 3], progress: grow,
});

plot(ctx, map, Math.sin, -6, 6, {
  color: colors.blue, progress: span(t, 1.0, 2.0),
});
plot(ctx, map, (x) => Math.cos(x) * 0.5, -6, 6, {
  color: colors.violet, progress: span(t, 2.4, 2.0),
});

ctx.globalAlpha = span(t, 3, 0.6);
text(ctx, 'sin(x)', 1500, 300, { size: 56, color: colors.blue, mono: true });
ctx.globalAlpha = span(t, 4.4, 0.6);
text(ctx, '½·cos(x)', 1500, 380, { size: 56, color: colors.violet, mono: true });
`;

export const SAMPLE_PHYSICS = `// Simulação: pêndulos com períodos diferentes (onda de pêndulos)
const { colors, text } = lib;
const N = 15, top = 140, L0 = 520;

ctx.strokeStyle = colors.grid; ctx.lineWidth = 4;
ctx.beginPath(); ctx.moveTo(260, top); ctx.lineTo(w - 260, top); ctx.stroke();

for (let i = 0; i < N; i++) {
  // cada pêndulo completa (20 + i) oscilações a cada 30 s
  const omega = (2 * Math.PI * (20 + i)) / 30;
  const theta = 0.42 * Math.cos(omega * t);
  const L = L0 * Math.pow(20 / (20 + i), 2) + 180;
  const x0 = 300 + i * ((w - 600) / (N - 1));
  const bx = x0 + L * Math.sin(theta);
  const by = top + L * Math.cos(theta);

  ctx.strokeStyle = 'rgba(236,238,242,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(bx, by); ctx.stroke();
  ctx.fillStyle = i % 2 ? colors.blue : colors.mint;
  ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
}

text(ctx, 't = ' + t.toFixed(2) + ' s', 80, h - 70, { size: 36, color: colors.dim, mono: true });
`;

export const SAMPLE_VOXEL = `// Voxels: um terreno isométrico que sobe em onda
const { voxel, colors, span, ease } = lib;
const S = 34, G = 12;
const ox = w / 2, oy = 300;
const rise = span(t, 0, 2.5, ease.out);

for (let gx = 0; gx < G; gx++) {
  for (let gy = 0; gy < G; gy++) {
    const d = Math.hypot(gx - G / 2, gy - G / 2);
    const hgt = Math.max(1, Math.round((Math.sin(d * 0.7 - t * 2) + 1.4) * 2.2 * rise));
    for (let gz = 0; gz < hgt; gz++) {
      const c = gz === hgt - 1 ? (d < 3 ? colors.mint : colors.violet) : colors.blue;
      voxel(ctx, ox, oy, gx, gy, gz, S, c);
    }
  }
}
`;

export const SAMPLE_BLANK = `// Nova cena. t = segundos, w × h = tamanho da cena.
const { text, colors, span } = lib;

ctx.globalAlpha = span(t, 0, 0.6);
text(ctx, 'Nova cena', w / 2, h / 2, { size: 96, weight: 600, align: 'center' });
`;
