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

export type Setor = {
  id: string;
  nome: string;
  regiao: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
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

// Busca as configs da Home/Sobre e devolve como um objeto fácil de usar: { headline: "...", foto_capa: "..." }
export async function getSiteConfig(): Promise<Record<string, string>> {
  const { data } = await supabase.from('site_config').select('chave, valor');
  const config: Record<string, string> = {};
  (data ?? []).forEach((row) => {
    if (row.valor) config[row.chave] = row.valor;
  });
  return config;
}
