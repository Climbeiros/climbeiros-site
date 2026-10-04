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
  local: string | null;
  descricao: string | null;
  link: string | null;
};

export type Novidade = {
  tipo: string;      // rótulo que aparece na etiqueta ("Novo local", "Novo guia"...)
  titulo: string;
  texto: string | null;
  href: string;
  data: string;      // data ISO de quando entrou no site
};

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// "2026-10-18" -> { dia: "18", mes: "OUT", ano: "2026" }
export function partesData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return { dia, mes: MESES[Number(mes) - 1] ?? '', ano };
}

// "2026-09-25T13:00:00Z" -> "25 set"
export function dataCurta(iso: string) {
  const { dia, mes } = partesData(iso);
  return `${Number(dia)} ${mes.toLowerCase()}`;
}

export async function getAgenda(): Promise<EventoAgenda[]> {
  try {
    const { data, error } = await supabase
      .from('agenda_eventos')
      .select('id, titulo, organizador, organizador_tipo, tipo, data, data_a_confirmar, local, descricao, link')
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

export async function getNovidades(limite = 10): Promise<Novidade[]> {
  const [locais, academias, guias, fotos, artigos, parceiros] = await Promise.all([
    buscar<{ nome: string; slug: string | null; cidade: string | null; estado: string | null; criado_em: string }>(
      supabase.from('locais').select('nome, slug, cidade, estado, criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ nome: string; cidade: string | null; estado: string | null; criado_em: string }>(
      supabase.from('academias').select('nome, cidade, estado, criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
    // Só os campos públicos do guia (a lista já vem filtrada: só aprovados).
    buscar<{ nome: string; cidade: string | null; uf: string | null; especialidades_lista: string[] | null; criado_em: string }>(
      supabase.from('inscricoes_guias').select('nome, cidade, uf, especialidades_lista, criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ nome: string; local: string | null; enviado_em: string }>(
      supabase.from('fotos_galeria').select('nome, local, enviado_em').eq('aprovado', true).order('enviado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ titulo: string; slug: string; categoria: string | null; resumo: string | null; publicado_em: string }>(
      supabase.from('artigos').select('titulo, slug, categoria, resumo, publicado_em').in('categoria', ['escalada101', 'crux']).order('publicado_em', { ascending: false }).limit(limite)
    ),
    buscar<{ nome_marca: string; descricao: string | null; criado_em: string }>(
      supabase.from('parceiros').select('nome_marca, descricao, criado_em').order('criado_em', { ascending: false }).limit(limite)
    ),
  ]);

  const lugar = (cidade: string | null, uf: string | null) => [cidade, uf].filter(Boolean).join(', ') || null;

  const itens: Novidade[] = [
    ...locais.filter((l) => l.criado_em).map((l) => ({
      tipo: 'Novo local', titulo: l.nome, texto: lugar(l.cidade, l.estado),
      href: l.slug ? `/rotas/${l.slug}` : '/rotas', data: l.criado_em,
    })),
    ...academias.filter((a) => a.criado_em).map((a) => ({
      tipo: 'Academia', titulo: a.nome, texto: lugar(a.cidade, a.estado), href: '/academias', data: a.criado_em,
    })),
    ...guias.filter((g) => g.criado_em).map((g) => ({
      tipo: 'Novo guia', titulo: g.nome,
      texto: [lugar(g.cidade, g.uf), (g.especialidades_lista ?? []).slice(0, 2).join(', ')].filter(Boolean).join(' · ') || null,
      href: '/cursos', data: g.criado_em,
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
  ];

  return itens
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .slice(0, limite);
}
