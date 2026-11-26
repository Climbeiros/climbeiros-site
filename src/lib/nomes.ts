// src/lib/nomes.ts
// No banco, os setores costumam ter o nome do local na frente
// ("Pedreira do Dib - Entrada", "Esconderijo do Ishigami - Setor 1: ...").
// Pra mostrar na tela, tiramos esse prefixo: "Entrada", "Setor 1: ...".
// O nome completo continua no banco e na busca.

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function nomeSetorCurto(nomeSetor: string, nomeLocal?: string | null): string {
  if (!nomeLocal) return nomeSetor;
  const curto = nomeSetor.replace(new RegExp(`^${escaparRegex(nomeLocal.trim())}\\s*[-–:]\\s*`, 'i'), '').trim();
  return curto || nomeSetor;
}

// Junta partes de localização sem repetir ("Mairiporã · Mairiporã · SP" vira "Mairiporã · SP").
export function juntarLugar(partes: (string | null | undefined)[]): string {
  return [...new Set(partes.filter(Boolean) as string[])].join(' · ');
}
