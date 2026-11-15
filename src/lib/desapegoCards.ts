// src/lib/desapegoCards.ts
// Desenho do card e do anúncio aberto do Desapego, em HTML. Usado pela página
// (src/pages/desapego.astro) e pela prévia do formulário (FormDesapego.astro),
// pra que "Visualizar meu anúncio" mostre exatamente o que vai aparecer no site.
// Os estilos (.dsp-...) ficam no <style is:global> da página do Desapego.
import { linkWhatsApp, linkInstagram } from './contatos';
import { categoria, CONSERVACAO, ENTREGAS, MODALIDADES, QUEDAS } from './desapego';

export type Anuncio = {
  id: string; categoria: string; titulo: string; marca_modelo: string | null; tamanho: string | null;
  conservacao: string; descricao: string | null; modalidade: string; preco: number | null; preco_original: number | null; editado_em: string | null; troca_por: string | null;
  entrega: string[]; retirada_bairros: string | null; entrega_academias: string | null; cidade: string; uf: string; fotos: string[]; nome: string; whatsapp: string; instagram: string | null;
  seg_ano_fabricacao: number | null; seg_quedas: string | null; seg_armazenamento: string | null;
  publicado_em: string; expira_em: string; vendido_em: string | null;
};

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: v % 1 ? 2 : 0 });
export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function precoTexto(a: Anuncio) {
  if (a.modalidade === 'doacao') return 'Grátis';
  if (a.modalidade === 'troca') return a.troca_por ? `Troco por ${a.troca_por}` : 'Aceita troca';
  return a.preco ? reais(Number(a.preco)) : 'Venda';
}
export const baixou = (a: Anuncio) => a.modalidade === 'venda' && a.preco != null && a.preco_original != null && Number(a.preco_original) > Number(a.preco);
// Preço em HTML: na venda com preço reduzido, mostra o antigo riscado ("de R$ 600 por R$ 500")
export function precoHtml(a: Anuncio, comPercentual = false) {
  if (!baixou(a)) return esc(precoTexto(a));
  const pct = Math.round((1 - Number(a.preco) / Number(a.preco_original)) * 100);
  return `<s class="dsp-de" aria-label="antes ${esc(reais(Number(a.preco_original)))}">${esc(reais(Number(a.preco_original)))}</s> ${esc(reais(Number(a.preco)))}${comPercentual && pct > 0 ? ` <span class="dsp-pct">−${pct}%</span>` : ''}`;
}
export function estadoTexto(a: Anuncio) {
  const base = CONSERVACAO[a.conservacao] ?? '';
  return categoria(a.categoria).seguranca && a.seg_ano_fabricacao ? `${base}, com histórico informado` : base;
}
export const entregaTexto = (a: Anuncio) => (a.entrega ?? []).map((e) => ENTREGAS[e]).filter(Boolean).join(' ou ');
// Versão completa, pro anúncio aberto: "retirada em Pinheiros · levo na academia: Casa de Pedra"
export const entregaDetalhe = (a: Anuncio) => (a.entrega ?? []).map((e) => {
  if (e === 'retirada' && a.retirada_bairros) return `retirada em ${a.retirada_bairros}`;
  if (e === 'academia' && a.entrega_academias) return `levo na academia: ${a.entrega_academias}`;
  return ENTREGAS[e];
}).filter(Boolean).map((t) => t.charAt(0).toUpperCase() + t.slice(1));

export function cardHtml(a: Anuncio) {
  const cat = categoria(a.categoria);
  const foto = (a.fotos ?? []).filter(Boolean)[0];
  const lugar = [`${a.cidade}, ${a.uf}`, entregaTexto(a)].filter(Boolean).join(' · ');
  return `
    <button type="button" class="dsp-card" data-id="${esc(a.id)}" aria-label="${esc(a.titulo)}: ver anúncio">
      <div class="dsp-card-foto">
        ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ''}
        <span class="dsp-tag dsp-tag--${esc(a.modalidade)}">${esc(MODALIDADES[a.modalidade])}</span>
        ${cat.seguranca ? '<span class="dsp-tag-seg" title="Equipamento de segurança">⚠️ Segurança</span>' : ''}
        ${baixou(a) && !a.vendido_em ? '<span class="dsp-tag-baixou">↓ Baixou o preço</span>' : ''}
        ${a.vendido_em ? '<div class="dsp-vendido-faixa">VENDIDO</div>' : ''}
      </div>
      <div class="dsp-card-corpo">
        <p class="dsp-preco">${precoHtml(a)}</p>
        <p class="dsp-titulo">${esc(a.titulo)}</p>
        <p class="dsp-linha">${esc(estadoTexto(a))}</p>
        <p class="dsp-linha">${esc(lugar)}</p>
      </div>
    </button>`;
}

export function detalheHtml(a: Anuncio) {
  const cat = categoria(a.categoria);
  const vendido = !!a.vendido_em;
  const fotos = (a.fotos ?? []).filter(Boolean);
  const msg = `Oi, ${a.nome}! Vi seu anúncio "${a.titulo}" no Desapego do Climbeiros. Ainda está disponível?`;
  const whats = linkWhatsApp(a.whatsapp);
  const insta = linkInstagram(a.instagram);
  const infos = [cat.rotulo, CONSERVACAO[a.conservacao], a.tamanho && `Tam. ${a.tamanho}`, a.marca_modelo].filter(Boolean);
  const seg = cat.seguranca ? `
    <div class="dsp-seg">
      <strong>⚠️ Equipamento de segurança.</strong>
      ${a.seg_ano_fabricacao ? `Fabricado em ${a.seg_ano_fabricacao}. ` : ''}${a.seg_quedas ? esc(QUEDAS[a.seg_quedas]) + '. ' : ''}${a.seg_armazenamento ? 'Uso e armazenamento: ' + esc(a.seg_armazenamento) + '. ' : ''}
      O Climbeiros não confere o material: peça pra alguém experiente conferir antes de usar. Na dúvida, não use.
    </div>` : '';
  return `
    <div class="dsp-det">
      <div class="dsp-det-fotos">
        ${fotos.length ? `<img class="dsp-det-principal" src="${esc(fotos[0])}" alt="${esc(a.titulo)}" data-ampliar>` : ''}
        ${fotos.length > 1 ? `<div class="dsp-det-minis">${fotos.map((f, i) => `<button type="button" data-foto="${esc(f)}" aria-pressed="${i === 0}" aria-label="Foto ${i + 1}"><img src="${esc(f)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="dsp-det-info">
        <span class="dsp-tag dsp-tag--${esc(a.modalidade)}" style="position:static;align-self:flex-start">${vendido ? 'Vendido' : esc(MODALIDADES[a.modalidade])}</span>
        <p class="dsp-preco">${precoHtml(a, true)}</p>
        ${baixou(a) ? '<p class="dsp-quem" style="color:var(--laranja);font-weight:600;margin-top:-4px">↓ Baixou o preço</p>' : ''}
        <h2>${esc(a.titulo)}</h2>
        <ul class="dsp-infos">${infos.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="dsp-entrega">
          <strong>Onde e como pegar</strong>
          <p class="dsp-local"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>${esc(a.cidade)}, ${esc(a.uf)}</p>
          ${a.entrega?.length ? `<ul>${entregaDetalhe(a).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        </div>
        ${seg}
        ${a.descricao ? `<p class="dsp-desc">${esc(a.descricao)}</p>` : ''}
        <p class="dsp-quem">Anunciado por ${esc(a.nome)}</p>
        ${vendido ? '' : `<div class="dsp-contato">
          ${whats ? `<a class="botao" href="${esc(whats)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Chamar no WhatsApp</a>` : ''}
          ${insta ? `<a class="botao botao--secundario" href="${esc(insta)}" target="_blank" rel="noopener">Instagram</a>` : ''}
        </div>`}
        <div class="dsp-rodape-card">
          <span>${vendido ? `Vendido em ${data(a.vendido_em!)}` : `No ar até ${data(a.expira_em)}`}</span>
          <button type="button" class="dsp-sou-eu" data-sou-eu>Sou quem anunciou</button>
        </div>
      </div>
    </div>`;
}
