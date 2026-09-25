// src/lib/contatos.ts
// Ajudantes pra montar links de contato a partir do que as pessoas digitam
// nos formulários. Cada um escreve de um jeito ("@perfil", "perfil",
// "instagram.com/perfil", "(21)99999-9999"...), então aqui a gente limpa
// tudo antes de virar link, pra nunca sair "@@perfil" ou link quebrado.

// Recebe qualquer forma de Instagram e devolve só o nome do perfil, sem "@".
// Exemplos: "@@mikenamontanha" -> "mikenamontanha"
//           "https://www.instagram.com/mikenamontanha/?hl=pt" -> "mikenamontanha"
export function usuarioInstagram(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let v = String(valor).trim();
  // Se colaram o link inteiro, pega só o pedaço depois de instagram.com/
  const doLink = v.match(/instagram\.com\/([^/?#\s]+)/i);
  if (doLink) v = doLink[1];
  // Tira todos os "@" e espaços do começo/fim
  v = v.replace(/^@+/, '').replace(/\s+/g, '').replace(/\/+$/, '');
  return v || null;
}

export function linkInstagram(valor: string | null | undefined): string | null {
  const u = usuarioInstagram(valor);
  return u ? `https://instagram.com/${u}` : null;
}

// Link do WhatsApp: o wa.me precisa do código do país (55). Se a pessoa
// digitou só DDD + número (10 ou 11 dígitos), a gente coloca o 55 na frente.
export function linkWhatsApp(valor: string | null | undefined): string | null {
  let n = String(valor || '').replace(/\D/g, '');
  if (!n) return null;
  if (n.length === 10 || n.length === 11) n = '55' + n;
  return `https://wa.me/${n}`;
}
