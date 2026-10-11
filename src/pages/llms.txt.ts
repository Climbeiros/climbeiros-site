// src/pages/llms.txt.ts
// Gera o arquivo https://www.climbeiros.com.br/llms.txt a cada deploy.
// É um resumo em texto simples do que é o site e quais são as páginas
// principais, pensado pra IAs (ChatGPT, Claude, Perplexity...) entenderem o
// Climbeiros rapidinho. A lista de locais e artigos vem do Supabase, então se
// atualiza sozinha: não precisa editar este arquivo quando entrar conteúdo novo.
import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://www.climbeiros.com.br')).origin;

  const [{ data: locais }, { data: artigos }] = await Promise.all([
    supabase
      .from('locais')
      .select('nome, slug, cidade, estado, tipos, descricao')
      .not('slug', 'is', null)
      .order('nome'),
    supabase
      .from('artigos')
      .select('titulo, slug, categoria, resumo')
      .in('categoria', ['escalada101', 'crux'])
      .order('titulo'),
  ]);

  const umaLinha = (texto?: string | null) =>
    (texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);

  const linhasLocais = (locais ?? []).map((l: any) => {
    const lugar = [l.cidade, l.estado].filter(Boolean).join('/');
    const tipos = (l.tipos ?? []).join(', ');
    const extra = [lugar, tipos].filter(Boolean).join(' · ');
    const desc = umaLinha(l.descricao);
    return `- [${l.nome}](${base}/rotas/${l.slug}/)${extra ? `: ${extra}` : ''}${desc ? `. ${desc}` : ''}`;
  });

  const linhasArtigos = (categoria: string, caminho: string) =>
    (artigos ?? [])
      .filter((a: any) => a.categoria === categoria && a.slug)
      .map((a: any) => {
        const resumo = umaLinha(a.resumo);
        return `- [${a.titulo}](${base}/${caminho}/${a.slug}/)${resumo ? `: ${resumo}` : ''}`;
      });

  const texto = [
    '# Climbeiros',
    '',
    '> Hub da comunidade de escalada no Brasil, em português. Reúne locais e setores de escalada com croquis e como chegar, academias e ginásios de escalada, guias e instrutores, conteúdo para iniciantes (Escalada 101) e avançados (Crux), agenda de eventos e cupons de equipamentos outdoor. Feito por escaladores, para escaladores.',
    '',
    'O conteúdo é mantido pela equipe Climbeiros e pela comunidade (avaliações, fotos e cadastros passam por moderação antes de aparecer). Croquis de terceiros são sempre creditados e, quando não há autorização, o site aponta para a fonte original.',
    '',
    '## Páginas principais',
    '',
    `- [Rotas & Setores](${base}/rotas/): mapa de locais de escalada no Brasil, com filtro por estado e tipo de escalada`,
    `- [Academias](${base}/academias/): academias e ginásios de escalada, com busca por cidade ou CEP`,
    `- [Guias & Cursos](${base}/cursos/): guias e instrutores de escalada e montanhismo e os locais onde atuam`,
    `- [Escalada 101](${base}/escalada101/): o básico para quem está começando`,
    `- [Equipamentos por modalidade](${base}/escalada101/equipamentos/): o que é essencial em boulder, esportiva, trad e mais`,
    `- [Tipos de agarras](${base}/escalada101/tipos-de-agarras/): tipos de agarra e de inclinação de parede`,
    `- [Vocabulário de escalada](${base}/escalada101/vocabulario/): termos usados na escalada no Brasil`,
    `- [Crux](${base}/crux/): conteúdo para quem já escala e quer evoluir`,
    `- [Técnicas & Posições](${base}/crux/tecnicas/): nomes das técnicas de escalada em português e inglês`,
    `- [Acontece](${base}/acontece/): agenda de eventos e novidades da comunidade`,
    `- [Parcerias & Cupons](${base}/parceiros/): marcas parceiras e cupons de desconto`,
    `- [Sobre](${base}/sobre/): quem são os Climbeiros`,
    `- [Contato](${base}/contato/)`,
    '',
    ...(linhasLocais.length ? ['## Locais de escalada', '', ...linhasLocais, ''] : []),
    ...(linhasArtigos('escalada101', 'escalada101').length
      ? ['## Artigos: Escalada 101', '', ...linhasArtigos('escalada101', 'escalada101'), '']
      : []),
    ...(linhasArtigos('crux', 'crux').length
      ? ['## Artigos: Crux', '', ...linhasArtigos('crux', 'crux'), '']
      : []),
    '## Contato e redes',
    '',
    '- Instagram: https://www.instagram.com/climbeiros/',
    `- Mapa do site: ${base}/sitemap-index.xml`,
    '',
  ].join('\n');

  return new Response(texto, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
