// Funções compartilhadas pela busca das páginas de Academias, Guias e Rotas.
// Servem tanto na hora de gerar a página (frontmatter do Astro) quanto no
// navegador (dentro dos <script>), pra todas buscarem do mesmo jeito.

// Tira acentos e deixa minúsculo, pra "sao paulo" achar "São Paulo".
export function normalizar(texto: string | null | undefined): string {
  return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Primeira letra de cada palavra maiúscula, pra "teresópolis" e
// "Teresópolis" virarem uma opção só no filtro de cidade.
export function capitalizar(texto: string | null | undefined): string {
  const minusculas = ['de', 'da', 'do', 'das', 'dos', 'e'];
  return (texto || '').trim().toLowerCase().split(/\s+/)
    .map((p, i) => (i > 0 && minusculas.includes(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export const ESTADOS: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

// Aceita "SP", "sp", "São Paulo" ou "sao paulo" e devolve sempre a sigla ("SP").
// Assim, se alguém cadastrar o estado por extenso no Supabase, o filtro não quebra.
export function siglaEstado(valor: string | null | undefined): string {
  const v = (valor || '').trim();
  if (!v) return '';
  const maiusculo = v.toUpperCase();
  if (ESTADOS[maiusculo]) return maiusculo;
  const alvo = normalizar(v);
  const achado = Object.entries(ESTADOS).find(([, nome]) => normalizar(nome) === alvo);
  return achado ? achado[0] : maiusculo;
}

// Texto que a busca livre procura: junta sigla e nome do estado, pra
// "SP" e "São Paulo" encontrarem a mesma coisa.
export function textoEstado(valor: string | null | undefined): string {
  const uf = siglaEstado(valor);
  return [uf, ESTADOS[uf]].filter(Boolean).join(' ');
}

// Lista de cidades pro filtro (sem repetição), cada uma ligada ao seu estado,
// pra lista de cidades poder mostrar só as do estado escolhido.
export function listarCidades(itens: { cidade: string | null; estado: string | null }[]) {
  const mapa = new Map<string, { nome: string; chave: string; uf: string }>();
  for (const item of itens) {
    if (!item.cidade) continue;
    const uf = siglaEstado(item.estado);
    const chave = normalizar(item.cidade);
    const id = chave + '|' + uf;
    if (!mapa.has(id)) mapa.set(id, { nome: capitalizar(item.cidade), chave, uf });
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Busca a cidade de um CEP no ViaCEP. Guarda o resultado pra não
// perguntar de novo o mesmo CEP.
const cacheCep = new Map<string, string | null>();
export async function cidadePorCep(cep: string): Promise<string | null> {
  if (cacheCep.has(cep)) return cacheCep.get(cep)!;
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await resposta.json();
    const cidade = dados.erro ? null : (dados.localidade as string);
    cacheCep.set(cep, cidade);
    return cidade;
  } catch {
    return null;
  }
}

// Se o texto digitado for um CEP (8 números, com ou sem traço), devolve só os números.
export function extrairCep(texto: string): string | null {
  const t = texto.trim();
  if (!/^[\d\s.-]+$/.test(t)) return null;
  const numeros = t.replace(/\D/g, '');
  return numeros.length === 8 ? numeros : null;
}
