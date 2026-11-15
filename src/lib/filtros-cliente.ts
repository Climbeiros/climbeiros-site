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
    salvarNoEndereco(texto, uf, cidade);
  }

  // Filtros ficam no endereço da página (ex.: /rotas/?uf=RJ). Assim, ao voltar de
  // um local, a lista volta filtrada, e dá pra mandar o link já filtrado (14/11/2026).
  function salvarNoEndereco(texto: string, uf: string, cidade: string) {
    try {
      const url = new URL(window.location.href);
      const p = url.searchParams;
      const pares: [string, string][] = [['q', texto.trim()], ['uf', uf], ['cidade', cidade],
        ...extras.map((f) => [f.campo, f.select!.value] as [string, string])];
      for (const [chave, valor] of pares) { if (valor) p.set(chave, valor); else p.delete(chave); }
      if (url.href !== window.location.href) history.replaceState(history.state, '', url);
    } catch { /* navegador antigo: segue sem guardar */ }
  }

  function lerDoEndereco(): boolean {
    const p = new URLSearchParams(window.location.search);
    const escolher = (sel: HTMLSelectElement | null, valor: string | null) => {
      if (sel && valor && Array.from(sel.options).some((op) => op.value === valor)) sel.value = valor;
    };
    escolher(o.filtroUf, p.get('uf'));
    atualizarCidades();
    escolher(o.filtroCidade, p.get('cidade'));
    extras.forEach((f) => escolher(f.select, p.get(f.campo)));
    if (o.campoBusca && p.get('q')) o.campoBusca.value = p.get('q')!;
    return ['q', 'uf', 'cidade', ...extras.map((f) => f.campo)].some((k) => p.get(k));
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

  if (lerDoEndereco()) aoDigitar();
}
