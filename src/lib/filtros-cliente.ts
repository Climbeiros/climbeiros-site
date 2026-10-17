// Busca + filtros que rodam no navegador (Academias e Rotas usam este mesmo código).
// Os cards já estão todos na página; aqui a gente só esconde os que não batem.
//
// Cada card precisa ter:
//   data-busca  -> todo o texto pesquisável, já normalizado (sem acento, minúsculo)
//   data-uf     -> sigla do estado (ex: "SP")
//   data-cidade -> cidade normalizada (ex: "sao paulo")
//   + um data-* para cada filtro extra (ex: data-modalidades="boulder|top-rope")

import { normalizar, extrairCep, cidadePorCep } from './busca';

type FiltroExtra = {
  select: HTMLSelectElement | null;
  campo: string; // nome do data-* no card (ex: "modalidades" para data-modalidades)
};

type Opcoes = {
  cards: HTMLElement[];
  campoBusca: HTMLInputElement | null;
  filtroUf: HTMLSelectElement | null;
  filtroCidade: HTMLSelectElement | null;
  filtrosExtras?: FiltroExtra[];
  botaoLimpar: HTMLElement | null;
  status: HTMLElement | null;
  semResultado: HTMLElement | null;
  rotulo: [string, string]; // ex: ["academia encontrada", "academias encontradas"]
  aoFiltrar?: (visiveis: HTMLElement[]) => void;
};

export function ativarBusca(o: Opcoes) {
  const extras = (o.filtrosExtras ?? []).filter((f) => f.select);
  let cidadeDoCep: string | null = null; // cidade normalizada vinda do CEP digitado
  let consultaAtual = 0;

  // Quando escolhe um estado, a lista de cidades mostra só as daquele estado.
  function atualizarCidades() {
    if (!o.filtroCidade) return;
    const uf = o.filtroUf?.value || '';
    for (const opt of Array.from(o.filtroCidade.options)) {
      if (!opt.value) continue;
      opt.hidden = !!uf && opt.dataset.uf !== uf;
    }
    const escolhida = o.filtroCidade.selectedOptions[0];
    if (escolhida && escolhida.hidden) o.filtroCidade.value = '';
  }

  function aplicar() {
    const texto = o.campoBusca?.value || '';
    const ehCep = !!extrairCep(texto);
    const termos = ehCep ? [] : normalizar(texto).split(/\s+/).filter(Boolean);
    const uf = o.filtroUf?.value || '';
    const cidade = o.filtroCidade?.value || '';

    const visiveis: HTMLElement[] = [];
    for (const card of o.cards) {
      const d = card.dataset;
      const ok =
        termos.every((t) => (d.busca || '').includes(t)) &&
        (!ehCep || (!!cidadeDoCep && d.cidade === cidadeDoCep)) &&
        (!uf || d.uf === uf) &&
        (!cidade || d.cidade === cidade) &&
        extras.every((f) => !f.select!.value || (d[f.campo] || '').split('|').includes(f.select!.value));
      card.hidden = !ok;
      if (ok) visiveis.push(card);
    }

    const filtrando = !!texto.trim() || !!uf || !!cidade || extras.some((f) => f.select!.value);
    if (o.botaoLimpar) o.botaoLimpar.hidden = !filtrando;
    if (o.semResultado) o.semResultado.hidden = visiveis.length > 0;
    if (o.status && !(ehCep && cidadeDoCep === null)) {
      const [um, varios] = o.rotulo;
      o.status.textContent = filtrando && visiveis.length > 0
        ? `${visiveis.length} ${visiveis.length === 1 ? um : varios}`
        : '';
    }
    o.aoFiltrar?.(visiveis);
  }

  // Se a pessoa digitou um CEP, descobre a cidade no ViaCEP antes de filtrar.
  async function aoDigitar() {
    const cep = extrairCep(o.campoBusca?.value || '');
    if (!cep) {
      cidadeDoCep = null;
      aplicar();
      return;
    }
    const minhaConsulta = ++consultaAtual;
    if (o.status) o.status.textContent = 'Buscando cidade pelo CEP...';
    const cidade = await cidadePorCep(cep);
    if (minhaConsulta !== consultaAtual) return; // a pessoa já digitou outra coisa
    if (!cidade) {
      cidadeDoCep = '';
      aplicar();
      if (o.status) o.status.textContent = 'CEP não encontrado. Tente digitar o nome da cidade.';
      return;
    }
    cidadeDoCep = normalizar(cidade);
    aplicar();
    if (o.status && o.status.textContent) o.status.textContent += ` em ${cidade}`;
  }

  o.campoBusca?.addEventListener('input', aoDigitar);
  o.filtroUf?.addEventListener('change', () => { atualizarCidades(); aplicar(); });
  o.filtroCidade?.addEventListener('change', aplicar);
  extras.forEach((f) => f.select!.addEventListener('change', aplicar));
  o.botaoLimpar?.addEventListener('click', () => {
    if (o.campoBusca) o.campoBusca.value = '';
    if (o.filtroUf) o.filtroUf.value = '';
    if (o.filtroCidade) o.filtroCidade.value = '';
    extras.forEach((f) => { f.select!.value = ''; });
    cidadeDoCep = null;
    atualizarCidades();
    aplicar();
    o.campoBusca?.focus();
  });
}
