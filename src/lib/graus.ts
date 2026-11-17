// src/lib/graus.ts
// Ajuda a resumir os graus das vias e boulders de um setor ou local
// (ex: "12 vias · 4º a 7º B"). Entende a graduação brasileira de vias
// (3º, 4º Sup, 7º A, 8º C...) e a escala V dos boulders (V0, V5/6...).
// Graus de artificial (A0, A1...) e vazios ficam de fora da faixa.

type ViaResumo = { grau: string | null; tipo: string | null; setor_id?: string | null };

// Transforma o grau num número pra dar pra comparar (maior = mais difícil).
function pesoVia(grau: string): number | null {
  const m = grau.trim().toUpperCase().match(/^(\d+)\s*º?\s*(SUP|A|B|C)?/);
  if (!m) return null;
  const extra: Record<string, number> = { SUP: 5, A: 2, B: 5, C: 8 };
  return Number(m[1]) * 10 + (m[2] ? extra[m[2]] : 0);
}

function pesoBoulder(grau: string): number | null {
  const m = grau.trim().toUpperCase().match(/^V(\d+)/);
  return m ? Number(m[1]) : null;
}

function faixa(graus: string[], peso: (g: string) => number | null): string | null {
  const validos = graus
    .map((g) => ({ g: g.trim(), p: peso(g) }))
    .filter((x): x is { g: string; p: number } => x.p != null)
    .sort((a, b) => a.p - b.p);
  if (validos.length === 0) return null;
  const min = validos[0].g;
  const max = validos[validos.length - 1].g;
  return min === max ? min : `${min} a ${max}`;
}

// Faixa de graus de uma lista de vias/boulders. Ex: "4º a 8º B · V1 a V3".
export function faixaGraus(rotas: ViaResumo[]): string | null {
  const boulders = rotas.filter((r) => r.tipo === 'boulder' && r.grau).map((r) => r.grau as string);
  const vias = rotas.filter((r) => r.tipo !== 'boulder' && r.tipo !== 'artificial' && r.grau).map((r) => r.grau as string);
  const partes = [faixa(vias, pesoVia), faixa(boulders, pesoBoulder)].filter(Boolean);
  return partes.length ? partes.join(' · ') : null;
}

// "12 vias", "1 boulder", "8 vias e boulders"...
export function contagemVias(rotas: ViaResumo[]): string | null {
  const n = rotas.length;
  if (n === 0) return null;
  const temBoulder = rotas.some((r) => r.tipo === 'boulder');
  const temVia = rotas.some((r) => r.tipo !== 'boulder');
  if (temBoulder && temVia) return `${n} vias e boulders`;
  if (temBoulder) return `${n} ${n === 1 ? 'boulder' : 'boulders'}`;
  return `${n} ${n === 1 ? 'via' : 'vias'}`;
}

// Resumo pronto pra mostrar: "12 vias · 4º a 7º B".
export function resumoVias(rotas: ViaResumo[]): string | null {
  const c = contagemVias(rotas);
  if (!c) return null;
  const f = faixaGraus(rotas);
  return f ? `${c} · ${f}` : c;
}

// Cores por dificuldade (mesma legenda do guia da Pedreira do Dib), usadas no
// croqui sobre foto e na lista de vias. "texto" é a cor do número em cima da cor.
export const FAIXAS_GRAU = [
  { id: '4', rotulo: 'até 4º', cor: '#f2d21b', texto: '#2a1f16' },
  { id: '5', rotulo: '5º', cor: '#f6b950', texto: '#2a1f16' },
  { id: '6', rotulo: '6º', cor: '#5e9e3f', texto: '#ffffff' },
  { id: '7', rotulo: '7º', cor: '#d62828', texto: '#ffffff' },
  { id: '8', rotulo: '8º', cor: '#1c8fd6', texto: '#ffffff' },
  { id: '9', rotulo: '9º ou mais', cor: '#7b3fa0', texto: '#ffffff' },
  { id: 'A', rotulo: 'Artificial', cor: '#9a9a9a', texto: '#2a1f16' },
  { id: '?', rotulo: 'Sem grau', cor: '#fffdf7', texto: '#2a1f16' },
] as const;
export type FaixaGrau = (typeof FAIXAS_GRAU)[number];

export function faixaGrau(grau: string | null, tipo?: string | null): FaixaGrau {
  const g = (grau ?? '').trim().toUpperCase();
  if (tipo === 'artificial' || /^A\d/.test(g)) return FAIXAS_GRAU[6];
  const n = parseInt(g, 10);
  if (!n) return FAIXAS_GRAU[7];
  if (n <= 4) return FAIXAS_GRAU[0];
  if (n >= 9) return FAIXAS_GRAU[5];
  return FAIXAS_GRAU[n - 4];
}

// Links pra abrir a rota até o lugar no celular.
export function linksNavegacao(lat: number | null, lon: number | null) {
  if (lat == null || lon == null) return null;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    waze: `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`,
  };
}
