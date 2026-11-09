// src/lib/acontece.ts
// Dados da página "Acontece" (e do bloco "Acabou de chegar" da home).
//
// - Agenda: vem da tabela `agenda_eventos` do Supabase. Vocês cadastram os
//   eventos lá (Table Editor) e fazem Redeploy na Vercel.
// - Novidades: montadas sozinhas a partir do que já existe no banco
//   (locais, academias, guias aprovados, fotos aprovadas, artigos, parceiros),
//   usando a data em que cada coisa entrou.
//
// Tudo aqui é "à prova de falha": se uma tabela não existir ou der erro,
// a página continua funcionando, só sem aquela parte.
import { supabase } from './supabase';

export type OrganizadorTipo = 'climbeiros' | 'academia' | 'comunidade';

export type EventoAgenda = {
  id: string;
  titulo: string;
  organizador: string;
  organizador_tipo: OrganizadorTipo;
  tipo: string | null;
  data: string; // AAAA-MM-DD
  data_a_confirmar: boolean;
  data_fim?: string | null; // AAAA-MM-DD, último dia (eventos de vários dias; opcional)
  local: string | null;
  descricao: string | null;
  link: string | null;
  horario?: string | null;   // ex: "19h às 23h" (opcional)
  logo?: string | null;      // logo do card: logo_url do evento, ou a foto da academia ligada (academia_id)
};

export type Novidade = {
  tipo: string;      // rótulo que aparece na etiqueta ("Novo local", "Novo guia"...)
  titulo: string;
  texto: string | null;
  href: string;
  data: string;      // data ISO de quando entrou no site
  foto?: string | null; // foto do guia (foto_url), mostrada no lugar das iniciais
  logo?: string | null; // logo da academia (imagem_url)
  mapa?: MiniMapa | null; // mini mapa do local novo
};

// Mini mapa (recorte de tiles do OpenStreetMap, os mesmos do mapa de Rotas)
// centrado no ponto, montado no build. O clique abre o Google Maps.
export type MiniMapa = {
  largura: number;
  altura: number;
  tiles: { src: string; x: number; y: number }[];
  google: string;
};

export function miniMapa(lat: number, lng: number, zoom = 11, largura = 132, altura = 96): MiniMapa {
  const n = 2 ** zoom;
  const px = ((lng + 180) / 360) * n * 256;
  const rad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  const x0 = px - largura / 2;
  const y0 = py - altura / 2;
  const tiles: MiniMapa['tiles'] = [];
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + largura - 1) / 256); tx++) {
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + altura - 1) / 256); ty++) {
      const wx = ((tx % n) + n) % n;
      tiles.push({ src: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`, x: Math.round(tx * 256 - x0), y: Math.round(ty * 256 - y0) });
    }
  }
  return { largura, altura, tiles, google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` };
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// "2026-10-18" -> { dia: "18", mes: "OUT", ano: "2026" }
export function partesData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return { dia, mes: MESES[Number(mes) - 1] ?? '', ano };
}

// "2026-10-29" -> "qui"
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export function diaSemana(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return SEMANA[new Date(ano, mes - 1, dia).getDay()];
}

// "2026-09-25T13:00:00Z" -> "25 set"
// Último dia do evento: data_fim quando existe e é depois do início; senão a própria data.
export function fimDoEvento(e: { data: string; data_fim?: string | null }) {
  return e.data_fim && e.data_fim > e.data ? e.data_fim : e.data;
}

export function dataCurta(iso: string) {
  const { dia, mes } = partesData(iso);
  return `${Number(dia)} ${mes.toLowerCase()}`;
}

const CAMPOS_AGENDA = 'id, titulo, organizador, organizador_tipo, tipo, data, data_a_confirmar, local, descricao, link';

export async function getAgenda(): Promise<EventoAgenda[]> {
  // 1ª tentativa: com horário e logo (colunas horario, logo_url e academia_id).
  try {
    const { data, error } = await supabase
      .from('agenda_eventos')
      .select(`${CAMPOS_AGENDA}, horario, logo_url, data_fim, academias(imagem_url)`)
      .eq('publicado', true)
      .order('data', { ascending: true });
    if (!error && data) {
      return (data as any[]).map(({ academias, logo_url, ...e }) => ({
        ...e,
        logo: logo_url || academias?.imagem_url || null,
      })) as EventoAgenda[];
    }
  } catch {
    /* segue pra versão simples */
  }
  // 2ª tentativa: se essas colunas ainda não existirem no banco, a agenda
  // continua aparecendo, só sem logo e horário.
  try {
    const { data, error } = await supabase
      .from('agenda_eventos')
      .select(CAMPOS_AGENDA)
      .eq('publicado', true)
      .order('data', { ascending: true });
    if (error || !data) return [];
    return data as EventoAgenda[];
  } catch {
    return [];
  }
}

// Busca uma tabela sem nunca quebrar o build.
async function buscar<T>(consulta: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await consulta;
    if (error || !Array.isArray(data)) return [];
    return data as T[];
  } catch {
    return [];
  }
}

// Páginas novas feitas em código (não vêm do Supabase), que também devem
// aparecer nas Novidades. Ao publicar uma página nova desse tipo, adicione
// uma linha aqui com a data de publicação.
const PAGINAS_NOVAS: Novidade[] = [
  {
    tipo: 'Crux',
    titulo: 'Seu primeiro outdoor',
    texto: 'Checklist do que levar e o que muda da academia pra rocha.',
    href: '/crux/primeiro-outdoor',
    data: '2026-10-12T21:13:45+00:00',
  },
  {
    tipo: 'Crux',
    titulo: 'Como ler um croqui',
    texto: 'Croqui interativo: chapeleta, parada, enfiada, exposição e proteção.',
    href: '/crux/como-ler-croqui',
    data: '2026-10-12T22:50:00+00:00',
  },
];

// limite: quantas novidades no máximo (no total e por tabela).
// dias: se informado, só conta como novidade o que entrou nos últimos `dias` dias
// (contados no momento do build; o redeploy diário das 06h07 mantém a janela em dia).
export async function getNovidades(limite = 10, dias?: number): Promise<Novidade[]> {
  const desde = dias ? new Date(Date.now() - dias * 86400000).toISOString() : null;
  // Aplica o corte de data na consulta, pra o limite não esconder itens dentro da janela.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentes = (q: any, col: string) => (desde ? q.gte(col, desde) : q);
  const [locais, academias, guias, fotos, artigos, parceiros] = await Promise.all([
    buscar<{ nome: string; slug: string | null; cidade: string | null; estado: string | null; latitude: number | null; longitude: number | null; criado_em: string }>(
      recentes(supabase.from('locais').select('nome, slug, cidade, estado, latitude, longitude, criado_em'), 'criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ nome: string; cidade: string | null; estado: string | null; imagem_url: string | null; criado_em: string }>(
      recentes(supabase.from('academias').select('nome, cidade, estado, imagem_url, criado_em'), 'criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
    // Só os campos públicos do guia (a lista já vem filtrada: só aprovados).
    buscar<{ nome: string; cidade: string | null; uf: string | null; especialidades_lista: string[] | null; criado_em: string }>(
      recentes(supabase.from('inscricoes_guias').select('nome, cidade, uf, especialidades_lista, foto_url, criado_em'), 'criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ nome: string; local: string | null; enviado_em: string }>(
      recentes(supabase.from('fotos_galeria').select('nome, local, enviado_em').eq('aprovado', true), 'enviado_em').order('enviado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ titulo: string; slug: string; categoria: string | null; resumo: string | null; publicado_em: string }>(
      recentes(supabase.from('artigos').select('titulo, slug, categoria, resumo, publicado_em').in('categoria', ['escalada101', 'crux']), 'publicado_em').order('publicado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ nome_marca: string; descricao: string | null; criado_em: string }>(
      recentes(supabase.from('parceiros').select('nome_marca, descricao, criado_em'), 'criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
  ]);

  const lugar = (cidade: string | null, uf: string | null) => [cidade, uf].filter(Boolean).join(', ') || null;

  const itens: Novidade[] = [
    ...locais.filter((l) => l.criado_em).map((l) => ({
      tipo: 'Novo local', titulo: l.nome, texto: lugar(l.cidade, l.estado),
      href: l.slug ? `/rotas/${l.slug}` : '/rotas', data: l.criado_em,
      mapa: l.latitude != null && l.longitude != null ? miniMapa(l.latitude, l.longitude, 11, 320, 110) : null,
    })),
    ...academias.filter((a) => a.criado_em).map((a) => ({
      tipo: 'Academia', titulo: a.nome, texto: lugar(a.cidade, a.estado), href: '/academias', data: a.criado_em,
      logo: a.imagem_url || null,
    })),
    ...guias.filter((g) => g.criado_em).map((g) => ({
      tipo: 'Novo guia', titulo: g.nome,
      texto: [lugar(g.cidade, g.uf), (g.especialidades_lista ?? []).slice(0, 2).join(', ')].filter(Boolean).join(' · ') || null,
      href: '/cursos', data: g.criado_em,
      // .heic/.heif (formato do iPhone) não abre na maioria dos navegadores: fica com as iniciais.
      foto: g.foto_url && !/\.(heic|heif)(\?|$)/i.test(g.foto_url) ? g.foto_url : null,
    })),
    ...fotos.filter((f) => f.enviado_em).map((f) => ({
      tipo: 'Galeria', titulo: f.local ? `Foto nova: ${f.local}` : 'Foto nova da comunidade', texto: `Mandada por ${f.nome}`,
      href: '/galeria', data: f.enviado_em,
    })),
    ...artigos.filter((a) => a.publicado_em).map((a) => ({
      tipo: a.categoria === 'crux' ? 'Crux' : 'Escalada 101', titulo: a.titulo, texto: a.resumo,
      href: a.categoria === 'crux' ? `/crux/${a.slug}` : `/escalada101/${a.slug}`, data: a.publicado_em,
    })),
    ...parceiros.filter((p) => p.criado_em).map((p) => ({
      tipo: 'Parceria', titulo: p.nome_marca, texto: p.descricao, href: '/parceiros', data: p.criado_em,
    })),
    ...PAGINAS_NOVAS,
  ];

  return itens
    .filter((n) => !desde || new Date(n.data).getTime() >= Date.parse(desde))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .slice(0, limite);
}
