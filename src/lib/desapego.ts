// src/lib/desapego.ts
// Listas e ajudantes do Desapego (anúncios de equipamento usado).
// Os valores (ex.: 'cordas') precisam bater com o "check" da tabela
// anuncios_desapego no Supabase (ver "Claude outputs/desapego.sql").

export const CATEGORIAS: { valor: string; rotulo: string; seguranca: boolean; emoji: string; ajuda?: string }[] = [
  { valor: 'sapatilhas', rotulo: 'Sapatilhas', seguranca: false, emoji: '👟' },
  { valor: 'cordas', rotulo: 'Cordas', seguranca: true, emoji: '🪢' },
  { valor: 'cadeirinhas', rotulo: 'Cadeirinhas', seguranca: true, emoji: '🧗' },
  { valor: 'capacetes', rotulo: 'Capacetes', seguranca: true, emoji: '⛑️' },
  { valor: 'ferragens', rotulo: 'Ferragens', seguranca: true, emoji: '🔗', ajuda: 'mosquetões, costuras, freios, friends, nuts' },
  { valor: 'fitas', rotulo: 'Fitas e cordeletes', seguranca: true, emoji: '➰', ajuda: 'fitas, cordeletes, solteiras' },
  { valor: 'magnesio', rotulo: 'Magnésio', seguranca: false, emoji: '🤍', ajuda: 'magnésio e saquinhos' },
  { valor: 'crashpads', rotulo: 'Crashpads', seguranca: false, emoji: '🟫' },
  { valor: 'roupas', rotulo: 'Roupas e mochilas', seguranca: false, emoji: '🎒' },
  { valor: 'outros', rotulo: 'Outros', seguranca: false, emoji: '📦' },
];

export const CONSERVACAO: Record<string, string> = {
  novo: 'Novo, nunca usado',
  pouco_uso: 'Pouco uso',
  usado: 'Usado',
  bem_usado: 'Bem usado',
};

export const MODALIDADES: Record<string, string> = {
  venda: 'Venda',
  troca: 'Troca',
  doacao: 'Doação',
};

export const QUEDAS: Record<string, string> = {
  nao: 'Não segurou queda forte',
  sim: 'Já segurou queda forte',
  nao_sei: 'Não sei se segurou queda forte',
};

export const ENTREGAS: Record<string, string> = {
  retirada: 'retirada',
  correio: 'envio pelo correio',
  academia: 'levo na academia',
};

export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function categoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export function ehSeguranca(valor: string) {
  return categoria(valor).seguranca;
}

// Diminui a foto no navegador antes de subir (fotos de celular têm 3–8 MB).
// Lado maior até 1600 px, em JPEG. Tenta 3 jeitos de abrir a foto, porque
// alguns navegadores (Safari do iPhone, principalmente) falham no primeiro:
// 1) createImageBitmap respeitando a rotação da foto; 2) createImageBitmap simples;
// 3) <img> comum. Só se os três falharem é que sobe a original.
type Imagem = { fonte: CanvasImageSource; largura: number; altura: number; liberar: () => void };

async function abrirImagem(arquivo: Blob): Promise<Imagem | null> {
  if (typeof createImageBitmap === 'function') {
    for (const opcoes of [{ imageOrientation: 'from-image' }, undefined]) {
      try {
        const bm = opcoes
          ? await createImageBitmap(arquivo, opcoes as ImageBitmapOptions)
          : await createImageBitmap(arquivo);
        if (bm.width > 0 && bm.height > 0) {
          return { fonte: bm, largura: bm.width, altura: bm.height, liberar: () => bm.close?.() };
        }
      } catch { /* tenta o próximo jeito */ }
    }
  }
  try {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.src = url;
    await new Promise<void>((ok, erro) => {
      img.onload = () => ok();
      img.onerror = () => erro(new Error('imagem'));
    });
    if (img.naturalWidth > 0) {
      return { fonte: img, largura: img.naturalWidth, altura: img.naturalHeight, liberar: () => URL.revokeObjectURL(url) };
    }
    URL.revokeObjectURL(url);
  } catch { /* não deu */ }
  return null;
}

async function canvasParaJpeg(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((ok) => {
    try { canvas.toBlob(ok, 'image/jpeg', qualidade); } catch { ok(null); }
  });
  if (blob && blob.size > 0) return blob;
  try {
    // Plano B: alguns navegadores devolvem null no toBlob
    return await (await fetch(canvas.toDataURL('image/jpeg', qualidade))).blob();
  } catch {
    return null;
  }
}

export async function reduzirFoto(arquivo: File, ladoMaximo = 1600): Promise<Blob> {
  const imagem = await abrirImagem(arquivo);
  if (!imagem) return arquivo;
  try {
    // Até 2 tentativas: se ainda passar de ~900 KB, reduz mais e comprime mais.
    for (const [lado, qualidade] of [[ladoMaximo, 0.82], [1280, 0.72]] as const) {
      const escala = Math.min(1, lado / Math.max(imagem.largura, imagem.altura));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(imagem.largura * escala));
      canvas.height = Math.max(1, Math.round(imagem.altura * escala));
      const ctx = canvas.getContext('2d');
      if (!ctx) return arquivo;
      ctx.drawImage(imagem.fonte, 0, 0, canvas.width, canvas.height);
      const blob = await canvasParaJpeg(canvas, qualidade);
      canvas.width = canvas.height = 0; // libera memória (importante no iPhone)
      if (blob && blob.size <= 900 * 1024) return blob;
      if (blob && lado === 1280) return blob;
    }
    return arquivo;
  } finally {
    imagem.liberar();
  }
}
