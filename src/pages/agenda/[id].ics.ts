// src/pages/agenda/[id].ics.ts
// Gera um arquivo de calendário por evento da agenda (ex.: /agenda/12.ics),
// usado pelo botão "+ Calendário" do Acontece nas opções iPhone/Mac e Outlook.
// É refeito a cada deploy, a partir da tabela `agenda_eventos`.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getAgenda, type EventoAgenda } from '../../lib/acontece';
import { arquivoIcs } from '../../lib/calendario';

export const getStaticPaths: GetStaticPaths = async () => {
  const agenda = await getAgenda();
  return agenda
    .filter((e) => !e.data_a_confirmar)
    .map((e) => ({ params: { id: String(e.id) }, props: { evento: e } }));
};

export const GET: APIRoute = ({ props }) => {
  const evento = props.evento as EventoAgenda;
  return new Response(arquivoIcs(evento), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
