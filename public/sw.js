/*
 * Service worker do Climbeiros (PWA).
 *
 * O que ele faz, em português simples:
 * - Páginas: tenta sempre a internet primeiro (conteúdo fresco). Se não tiver
 *   sinal, ou se a internet demorar mais de 4s, entrega a última cópia salva.
 *   Se a página nunca foi aberta, mostra a página /offline/.
 * - Estilos, scripts e fontes: guarda depois do primeiro uso (eles têm nome
 *   único a cada deploy, então nunca ficam desatualizados).
 * - Imagens: mostra a cópia salva na hora e atualiza em segundo plano.
 * - PDFs de croqui: guarda os últimos 4 abertos.
 * - NUNCA guarda: vídeos, dados do Supabase, previsão do tempo, mapas,
 *   formulários (POST) nem o painel interno.
 *
 * Para forçar todo mundo a pegar uma versão nova deste arquivo, aumente VERSAO.
 */
const VERSAO = 'v1';

const CACHE_BASE = `climbeiros-base-${VERSAO}`;
const CACHE_PAGINAS = 'climbeiros-paginas';
const CACHE_ARQUIVOS = 'climbeiros-arquivos';
const CACHE_IMAGENS = 'climbeiros-imagens';
const CACHE_FONTES = 'climbeiros-fontes';
const CACHE_PDFS = 'climbeiros-pdfs';
// Locais que a pessoa salvou com o botão "Salvar offline". Sem limite e
// mantido entre versões: só some se a pessoa remover ou o celular limpar.
const CACHE_SALVOS = 'climbeiros-salvos';

const CACHES_ATUAIS = [CACHE_BASE, CACHE_PAGINAS, CACHE_ARQUIVOS, CACHE_IMAGENS, CACHE_FONTES, CACHE_PDFS, CACHE_SALVOS];

const LIMITES = {
  [CACHE_PAGINAS]: 60,
  [CACHE_ARQUIVOS]: 150,
  [CACHE_IMAGENS]: 120,
  [CACHE_PDFS]: 4,
};

// Páginas guardadas logo na instalação (leves, úteis sem sinal).
const PRECACHE = [
  '/',
  '/offline/',
  '/rotas/',
  '/escalada101/',
  '/crux/',
  '/crux/como-ler-croqui/',
  '/crux/primeiro-outdoor/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/logo.png',
];

const TEMPO_LIMITE_MS = 4000;

// ---------- utilidades ----------

// /rotas/x e /rotas/x/ são a mesma página: guarda tudo sem a barra final.
function chavePagina(url) {
  const u = new URL(url);
  const caminho = u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '/';
  return u.origin + caminho;
}

// Resposta que veio de um redirecionamento não pode ser entregue numa
// navegação; recriar a resposta remove essa marca.
async function respostaLimpa(res) {
  if (!res.redirected) return res;
  const corpo = await res.blob();
  return new Response(corpo, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function limitar(nomeCache) {
  const max = LIMITES[nomeCache];
  if (!max) return;
  const cache = await caches.open(nomeCache);
  const chaves = await cache.keys();
  for (let i = 0; i < chaves.length - max; i++) await cache.delete(chaves[i]);
}

async function guardar(nomeCache, chave, res) {
  if (!res || !res.ok) return;
  const cache = await caches.open(nomeCache);
  await cache.put(chave, res);
  limitar(nomeCache);
}

function comTempoLimite(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('tempo')), ms);
    promessa.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// ---------- instalação e ativação ----------

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_BASE);
    // Um item que falhar não impede os outros.
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const res = await respostaLimpa(await fetch(url, { cache: 'reload' }));
        if (res.ok) await cache.put(url.endsWith('/') ? chavePagina(new URL(url, self.location.origin)) : url, res);
      } catch { /* sem problema, tenta de novo na próxima versão */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes
      .filter((n) => n.startsWith('climbeiros-') && !CACHES_ATUAIS.includes(n))
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// ---------- estratégias ----------

async function pagina(request) {
  const chave = chavePagina(request.url);
  const daRede = fetch(request).then(async (res) => {
    if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
      const limpa = await respostaLimpa(res);
      guardar(CACHE_PAGINAS, chave, limpa.clone());
      return limpa;
    }
    return res;
  });

  try {
    return await comTempoLimite(daRede, TEMPO_LIMITE_MS);
  } catch {
    const salva = await caches.match(chave);
    if (salva) return salva;
    // Internet lenta mas existente: espera mais um pouco antes de desistir.
    try { return await daRede; } catch { /* sem sinal */ }
    return (await caches.match(chavePagina(self.location.origin + '/offline/'))) ||
      new Response('<h1>Sem conexão</h1><p>Abra esta página de novo quando tiver sinal.</p>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function primeiroCache(request, nomeCache) {
  const salva = await caches.match(request);
  if (salva) return salva;
  const res = await fetch(request);
  guardar(nomeCache, request, res.clone());
  return res;
}

async function cacheEAtualiza(request, nomeCache) {
  const salva = await caches.match(request);
  const daRede = fetch(request).then((res) => {
    guardar(nomeCache, request, res.clone());
    return res;
  }).catch(() => salva);
  return salva || daRede;
}

// ---------- roteamento ----------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const mesmoSite = url.origin === self.location.origin;

  // Fontes do Google: guarda depois do primeiro uso.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheEAtualiza(request, CACHE_FONTES));
    return;
  }

  // Imagens públicas guardadas no Supabase (capas, galeria).
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/')
      && request.destination === 'image') {
    event.respondWith(cacheEAtualiza(request, CACHE_IMAGENS));
    return;
  }

  // Qualquer outro site (Supabase, Open-Meteo, mapas, Vercel Analytics...) passa direto.
  if (!mesmoSite) return;

  // Coisas que nunca entram no cache.
  if (url.pathname.startsWith('/videos/') || url.pathname.startsWith('/_vercel/')
      || url.pathname === '/painel-pendencias.html' || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(pagina(request));
    return;
  }

  if (url.pathname.startsWith('/_astro/') && request.destination !== 'image') {
    event.respondWith(primeiroCache(request, CACHE_ARQUIVOS));
    return;
  }

  if (url.pathname.endsWith('.pdf')) {
    event.respondWith(cacheEAtualiza(request, CACHE_PDFS));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(cacheEAtualiza(request, CACHE_IMAGENS));
  }
});
