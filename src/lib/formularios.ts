// src/lib/formularios.ts
// Pedacinhos usados por todos os formulários de cadastro.

// Máscara de telefone: só dígitos, no formato (11)991721313.
export function mascaraTelefone(campo: HTMLInputElement | null) {
  campo?.addEventListener('input', () => {
    const numeros = campo.value.replace(/\D/g, '').slice(0, 11);
    let formatado = '';
    if (numeros.length > 0) formatado = '(' + numeros.slice(0, 2);
    if (numeros.length >= 2) formatado += ')' + numeros.slice(2);
    campo.value = formatado;
  });
}

export function telefoneValido(valor: string): boolean {
  return !valor || /^\(\d{2}\)\d{9}$/.test(valor);
}

// Nome de arquivo único pra subir no Storage.
export function nomeArquivoUnico(arquivo: File): string {
  const extensao = (arquivo.name.split('.').pop() || 'bin').toLowerCase();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`;
}
