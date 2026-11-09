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

// Mensagem pronta quando alguém chama um guia no WhatsApp (08/11/2026).
// Sem cupom: "Oi, Henrique! Vi seu perfil no site do Climbeiros e queria saber mais sobre escalar com você."
// Com cupom: a mesma frase + "Vi também o cupom CODIGO (benefício). Posso usar?"
// (o benefício entre parênteses só aparece se o guia preencheu a descrição do cupom).
type GuiaMensagem = {
  nome?: string | null;
  cupom_codigo?: string | null;
  cupom_desc?: string | null;
};
export function mensagemGuia(g: GuiaMensagem): string {
  const primeiroNome = String(g.nome || '').trim().split(/\s+/)[0] || '';
  const oi = primeiroNome ? `Oi, ${primeiroNome}!` : 'Oi!';
  let msg = `${oi} Vi seu perfil no site do Climbeiros e queria saber mais sobre escalar com você.`;
  const codigo = String(g.cupom_codigo || '').trim();
  if (codigo) {
    const desc = String(g.cupom_desc || '').trim().replace(/[.\s]+$/, '');
    msg += ` Vi também o cupom ${codigo}${desc ? ` (${desc})` : ''}. Posso usar?`;
  }
  return msg;
}

// Link do WhatsApp já com a mensagem pronta (ou null se não houver número).
export function linkWhatsAppComMensagem(valor: string | null | undefined, mensagem: string): string | null {
  const link = linkWhatsApp(valor);
  return link ? `${link}?text=${encodeURIComponent(mensagem)}` : null;
}
