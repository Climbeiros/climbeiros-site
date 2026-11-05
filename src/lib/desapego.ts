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
// Lado maior até 1600 px, JPEG ~82%. Se não der pra converter, sobe a original.
export async function reduzirFoto(arquivo: File, ladoMaximo = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}
