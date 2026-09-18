import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos das tabelas (deixam o autocomplete mais esperto e o código mais seguro)
export type Academia = {
  id: string;
  nome: string;
  cidade: string;
  estado: string | null;
  endereco: string | null;
  Modalidades: string | null;
  telefone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  descricao: string | null;
  imagem_url: string | null;
  climbeiros_indica: boolean;
};

export type Curso = {
  id: string;
  nome: string;
  instituicao: string | null;
  cidade: string | null;
  modalidade: string | null;
  nivel: string | null;
  preco: string | null;
  link_inscricao: string | null;
  descricao: string | null;
  imagem_url: string | null;
};

export type Local = {
  id: string;
  nome: string;
  slug: string | null;
  regiao: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
  como_chegar: string | null;
  imagem_capa_url: string | null;
  tipos: string[] | null;
  guia_recomendado: string | null;
  croqui_referencias: { label: string; url: string }[] | null;
};

export type Setor = {
  id: string;
  local_id: string | null;
  lado: string | null;
  nome: string;
  slug: string | null;
  regiao: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
  como_chegar: string | null;
  croqui_tipo: 'link' | 'pdf' | 'foto' | 'referencia' | null;
  croqui_url: string | null;
  croqui_texto: string | null;
};

export type Croqui = {
  id: string;
  setor_id: string;
  tipo: 'link' | 'pdf' | 'foto' | 'referencia';
  url: string | null;
  texto: string | null;
};

export type Rota = {
  id: string;
  setor_id: string;
  nome: string;
  grau: string | null;
  tipo: string | null;
  numero_enfiadas: number | null;
  fotos_url: string[] | null;
  croqui_url: string | null;
  descricao: string | null;
};

export type Artigo = {
  id: string;
  titulo: string;
  slug: string;
  categoria: string | null;
  resumo: string | null;
  conteudo: string;
  imagem_capa_url: string | null;
  autor: string | null;
  publicado_em: string;
};

export type Parceiro = {
  id: string;
  nome_marca: string;
  logo_url: string | null;
  descricao: string | null;
  codigo_cupom: string | null;
  link_afiliado: string | null;
};

export type SiteConfig = {
  chave: string;
  valor: string | null;
  tipo: string | null;
};

export type AvaliacaoPublica = {
  id: string;
  academia_id: string;
  nome: string;
  nota: number;
  comentario: string | null;
  enviado_em: string;
};

// Guia e Hospedagem vêm direto do "inbox" de inscrições (inscricoes_guias /
// inscricoes_hospedagens): não existe mais tabela curada separada. O que o
// site lê já é filtrado no banco (RLS) por processado=true e rejeitado=false,
// então aparecer aqui = aprovado no painel de pendências.
export type Guia = {
  id: number;
  nome: string;
  cidade: string | null;
  uf: string | null;
  especialidades_lista: string[] | null;
  bio: string | null;
  foto_url: string | null;
  telefone: string | null;
  instagram: string | null;
  email: string | null;
  certificacao: string | null;
  locais_ids: string[] | null;
  ordem: number;
};

export type Hospedagem = {
  id: number;
  nome: string;
  contato_reserva: string | null;
  link_reserva: string | null;
  distancia: string | null;
  tem_desconto: string | null;
  desconto_codigo: string | null;
  desconto_desc: string | null;
  locais_ids: string[] | null;
  ordem: number;
};

export type AvaliacaoLocalPublica = {
  id: string;
  local_id: string;
  nome: string;
  nota: number;
  comentario: string | null;
  link_video: string | null;
  enviado_em: string;
};

export type FotoAvaliacaoLocalPublica = {
  id: string;
  avaliacao_id: string;
  imagem_url: string;
  enviado_em: string;
};

// Busca as configs da Home/Sobre e devolve como um objeto fácil de usar: { headline: "...", foto_capa: "..." }
export async function getSiteConfig(): Promise<Record<string, string>> {
  const { data } = await supabase.from('site_config').select('chave, valor');
  const config: Record<string, string> = {};
  (data ?? []).forEach((row) => {
    if (row.valor) config[row.chave] = row.valor;
  });
  return config;
}
