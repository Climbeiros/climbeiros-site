// src/lib/calendario.ts
// Botão "+ Calendário" da agenda (página Acontece): monta o link do Google
// Agenda e o arquivo .ics (iPhone, Mac, Outlook...) de cada evento.
//
// - Evento com horário (campo `horario`, ex.: "19h às 23h", "10h", "8h30"):
//   entra com hora de início e fim. Sem hora de fim, conta 2 horas.
// - Evento sem horário, ou de vários dias (`data_fim`): entra como "dia inteiro".
// - Evento "data a confirmar" não tem botão.
// Horário sempre de Brasília (o Brasil não tem mais horário de verão).
import { fimDoEvento, type EventoAgenda } from './acontece';

const SITE = 'https://www.climbeiros.com.br';
const FUSO = '-03:00';

type Quando =
  | { diaInteiro: true; inicio: string; fimExclusivo: string } // AAAAMMDD
  | { diaInteiro: false; inicio: Date; fim: Date };

// "19h às 23h" -> [{h:19,m:0},{h:23,m:0}]; "8h30" -> [{h:8,m:30}]
function horasDoTexto(txt: string) {
  const achados: { h: number; m: number }[] = [];
  const re = /(\d{1,2})\s*(?:h|:|hrs?|horas?)\s*(\d{2})?/gi;
  let r: RegExpExecArray | null;
  while ((r = re.exec(txt))) {
    const h = Number(r[1]);
    const m = r[2] ? Number(r[2]) : 0;
    if (h < 24 && m < 60) achados.push({ h, m });
  }
  return achados;
}

function maisUmDia(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const semTraco = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
const doisDig = (n: number) => String(n).padStart(2, '0');

function quando(e: EventoAgenda): Quando {
  const fim = fimDoEvento(e);
  const horas = e.horario ? horasDoTexto(e.horario) : [];
  if (fim !== e.data || horas.length === 0) {
    return { diaInteiro: true, inicio: semTraco(e.data), fimExclusivo: semTraco(maisUmDia(fim)) };
  }
  const [a, b] = horas;
  const inicio = new Date(`${e.data}T${doisDig(a.h)}:${doisDig(a.m)}:00${FUSO}`);
  let termino: Date;
  if (b) {
    termino = new Date(`${e.data}T${doisDig(b.h)}:${doisDig(b.m)}:00${FUSO}`);
    if (termino <= inicio) termino = new Date(termino.getTime() + 86400000); // passa da meia-noite
  } else {
    termino = new Date(inicio.getTime() + 2 * 3600000);
  }
  return { diaInteiro: false, inicio, fim: termino };
}

// Date -> "20261115T130000Z"
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function descricao(e: EventoAgenda) {
  const partes = [
    e.organizador ? `Organizado por ${e.organizador}.` : '',
    (e.descricao ?? '').trim().slice(0, 600),
    e.link ? `Detalhes: ${e.link}` : '',
    `Visto na agenda dos Climbeiros: ${SITE}/acontece/`,
  ];
  return partes.filter(Boolean).join('\n\n');
}

// Endereço do arquivo .ics do evento (gerado por src/pages/agenda/[id].ics.ts)
export const linkIcs = (e: EventoAgenda) => `/agenda/${e.id}.ics`;

export function linkGoogle(e: EventoAgenda) {
  const q = quando(e);
  const datas = q.diaInteiro ? `${q.inicio}/${q.fimExclusivo}` : `${utc(q.inicio)}/${utc(q.fim)}`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: datas,
    details: descricao(e),
    ctz: 'America/Sao_Paulo',
  });
  if (e.local) p.set('location', e.local);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// Texto no formato de calendário: escapa \ ; , e quebras de linha.
const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Linhas do .ics não podem passar de 75 bytes: quebra e continua com espaço.
function dobrar(linha: string) {
  const bytes = new TextEncoder();
  const saida: string[] = [];
  let atual = '';
  for (const ch of linha) {
    const limite = saida.length === 0 ? 75 : 74;
    if (bytes.encode(atual + ch).length > limite) {
      saida.push(atual);
      atual = ch;
    } else {
      atual += ch;
    }
  }
  saida.push(atual);
  return saida.join('\r\n ');
}

export function arquivoIcs(e: EventoAgenda) {
  const q = quando(e);
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Climbeiros//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@climbeiros.com.br`,
    `DTSTAMP:${utc(new Date())}`,
    ...(q.diaInteiro
      ? [`DTSTART;VALUE=DATE:${q.inicio}`, `DTEND;VALUE=DATE:${q.fimExclusivo}`]
      : [`DTSTART:${utc(q.inicio)}`, `DTEND:${utc(q.fim)}`]),
    `SUMMARY:${esc(e.titulo)}`,
    ...(e.local ? [`LOCATION:${esc(e.local)}`] : []),
    `DESCRIPTION:${esc(descricao(e))}`,
    ...(e.link ? [`URL:${e.link}`] : []),
    // Lembrete 1 dia antes (dia inteiro: às 9h do dia anterior)
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(e.titulo)}`,
    `TRIGGER:${q.diaInteiro ? '-PT15H' : '-P1D'}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}

// "sáb, 15 nov" / "15 a 17 nov" (aparece no topo do menu)
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function quandoCurto(e: EventoAgenda) {
  const [, m, d] = e.data.split('-').map(Number);
  const fim = fimDoEvento(e);
  if (fim !== e.data) {
    const [, m2, d2] = fim.split('-').map(Number);
    return m2 === m ? `${d} a ${d2} ${MES[m - 1]}` : `${d} ${MES[m - 1]} a ${d2} ${MES[m2 - 1]}`;
  }
  const [a] = e.data.split('-').map(Number);
  return `${SEMANA[new Date(a, m - 1, d).getDay()]}, ${d} ${MES[m - 1]}`;
}
