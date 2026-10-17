-- Formulário "Divulgar um evento"
-- Rodar uma vez no Supabase: SQL Editor -> New query -> colar tudo -> Run.

-- 1) Contato de quem sugeriu o evento pelo site. Fica separado da agenda
--    (que é pública), pra ninguém conseguir ler o e-mail de quem enviou.
create table if not exists public.agenda_eventos_contatos (
  evento_id uuid primary key references public.agenda_eventos(id) on delete cascade,
  nome text not null,
  email text not null,
  celular text,
  da_organizacao boolean not null default false,
  mensagem text,
  criado_em timestamptz not null default now()
);
alter table public.agenda_eventos_contatos enable row level security;
drop policy if exists "envio publico contato do evento" on public.agenda_eventos_contatos;
create policy "envio publico contato do evento" on public.agenda_eventos_contatos
  for insert to anon with check (true);

-- 2) Painel de pendências: eventos enviados pelo site mostram quem mandou,
--    celular, mensagem e e-mail. As outras origens continuam iguais.
create or replace view public.pendencias_moderacao with (security_invoker = true) as
 SELECT 'avaliacao_academia'::text AS origem, aa.id::text AS id, 'Avaliação de '::text || a.nome AS titulo,
    ((((('Nota '::text || aa.nota) || '/5'::text) || COALESCE((': "'::text || aa.comentario) || '"'::text, ''::text)) || ' (de '::text) || aa.nome) || ')'::text AS detalhe,
    aa.email AS contato, aa.enviado_em, NULL::text AS imagem_url
   FROM avaliacoes_academias aa JOIN academias a ON a.id = aa.academia_id
  WHERE aa.aprovado = false AND aa.rejeitado = false
UNION ALL
 SELECT 'avaliacao_setor'::text, av.id::text, 'Avaliação de '::text || l.nome,
    ((((('Nota '::text || av.nota) || '/5'::text) || COALESCE((': "'::text || av.comentario) || '"'::text, ''::text)) || ' (de '::text) || av.nome) || ')'::text,
    av.email, av.enviado_em, NULL::text
   FROM avaliacoes_locais av LEFT JOIN locais l ON l.id = av.local_id
  WHERE av.aprovado = false AND av.rejeitado = false
UNION ALL
 SELECT 'foto_avaliacao_setor'::text, f.id::text, 'Foto anexada a uma avaliação de local'::text,
    'Referente à avaliação '::text || f.avaliacao_id::text, NULL::text, f.enviado_em, f.imagem_url
   FROM avaliacoes_locais_fotos f
  WHERE f.aprovado = false AND f.rejeitado = false
UNION ALL
 SELECT 'foto_galeria'::text, g.id::text, 'Foto para a galeria: '::text || g.nome,
    COALESCE(g.local, ''::text), g.instagram, g.enviado_em, g.imagem_url
   FROM fotos_galeria g
  WHERE g.aprovado = false AND g.rejeitado = false
UNION ALL
 SELECT 'cadastro_guia'::text, ig.id::text, 'Inscrição de guia: '::text || ig.nome,
    (COALESCE(ig.especialidades, ''::text) || COALESCE(' | '::text || ig.mensagem, ''::text)) || COALESCE(' | Local não cadastrado: '::text || ig.locais_interesse, ''::text),
    ig.email, ig.criado_em, NULL::text
   FROM inscricoes_guias ig
  WHERE ig.processado = false AND ig.rejeitado = false
UNION ALL
 SELECT 'cadastro_parceiro'::text, ip.id::text, 'Inscrição de parceiro: '::text || ip.marca,
    COALESCE(ip.categoria, ''::text) || COALESCE(' | '::text || ip.mensagem, ''::text),
    ip.email, ip.criado_em, NULL::text
   FROM inscricoes_parceiros ip
  WHERE ip.processado = false AND ip.rejeitado = false
UNION ALL
 SELECT 'cadastro_hospedagem'::text, ih.id::text, 'Inscrição de hospedagem: '::text || ih.nome,
    COALESCE(ih.mensagem, ''::text), ih.contato_reserva, ih.criado_em, NULL::text
   FROM inscricoes_hospedagens ih
  WHERE ih.processado = false AND ih.rejeitado = false
UNION ALL
 SELECT 'mensagem_contato'::text, mc.id::text, 'Mensagem de contato: '::text || COALESCE(mc.assunto, mc.nome),
    mc.mensagem, mc.email, mc.enviado_em, NULL::text
   FROM mensagens_contato mc
  WHERE mc.processado = false AND mc.rejeitado = false
UNION ALL
 SELECT 'feedback'::text, fp.id::text, (('Feedback ('::text || fp.tipo) || ') em '::text) || fp.pagina,
    fp.mensagem, fp.email, fp.criado_em, NULL::text
   FROM feedback_paginas fp
  WHERE fp.processado = false AND fp.rejeitado = false
UNION ALL
 SELECT 'envio_croqui'::text, ec.id::text,
    'Croqui enviado: '::text || COALESCE(s.nome, ec.setor_sugerido, l.nome, ec.local_sugerido, 'local não informado'::text),
    concat_ws(' | '::text, 'De '::text || ec.nome, 'Crédito: '::text || ec.credito, cardinality(ec.arquivos)::text || ' arquivo(s) no bucket croquis-envios'::text, 'Link: '::text || ec.link_externo, ec.mensagem),
    ec.contato, ec.enviado_em, NULL::text
   FROM envios_croqui ec LEFT JOIN setores s ON s.id = ec.setor_id LEFT JOIN locais l ON l.id = ec.local_id
  WHERE ec.processado = false AND ec.rejeitado = false
UNION ALL
 SELECT 'cadastro_academia'::text, ia.id::text, 'Cadastro de academia: '::text || ia.nome,
    concat_ws(' | '::text, (ia.cidade || ' / '::text) || ia.estado, ia.endereco, 'Modalidades: '::text || ia.modalidades, ia.descricao, 'WhatsApp: '::text || ia.whatsapp, 'Instagram: '::text || ia.instagram, 'Site: '::text || ia.website,
      ('Enviado por '::text || ia.contato_nome) || CASE WHEN ia.responsavel THEN ' (dono/funcionário da academia)'::text ELSE ' (não marcou que trabalha lá)'::text END,
      'Mensagem: '::text || ia.mensagem),
    ia.contato_email, ia.criado_em, ia.imagem_url
   FROM inscricoes_academias ia
  WHERE ia.processado = false AND ia.rejeitado = false
UNION ALL
 SELECT 'avaliacao_guia'::text, ag.id::text, 'Avaliação do guia '::text || g.nome,
    ((((('Nota '::text || ag.nota) || '/5'::text) || COALESCE((': "'::text || ag.comentario) || '"'::text, ''::text)) || ' (de '::text) || ag.nome) || ')'::text,
    ag.email, ag.enviado_em, NULL::text
   FROM avaliacoes_guias ag JOIN inscricoes_guias g ON g.id = ag.guia_id
  WHERE ag.aprovado = false AND ag.rejeitado = false
UNION ALL
 SELECT 'evento_agenda'::text, ev.id::text, 'Evento: '::text || ev.titulo,
    concat_ws(' | '::text,
        CASE WHEN ev.data_a_confirmar THEN 'Data a confirmar'::text ELSE to_char(ev.data::timestamp with time zone, 'DD/MM/YYYY'::text) END || COALESCE(' · '::text || ev.horario, ''::text),
        'Organizador: '::text || ev.organizador, 'Tipo: '::text || ev.tipo, 'Local: '::text || ev.local, ev.descricao, 'Link: '::text || ev.link, 'Origem: '::text || ev.origem,
        ('Enviado por '::text || c.nome) || CASE WHEN c.da_organizacao THEN ' (faz parte da organização)'::text ELSE ' (não marcou que é da organização)'::text END,
        'Celular: '::text || c.celular,
        'Mensagem: '::text || c.mensagem,
        ( SELECT '⚠ POSSÍVEL DUPLICADO de evento já publicado: '::text || string_agg(((d.titulo || ' ('::text) || to_char(d.data::timestamp with time zone, 'DD/MM'::text)) || ')'::text, '; '::text)
           FROM agenda_eventos d
          WHERE d.publicado AND d.id <> ev.id AND (d.link = ev.link OR d.organizador = ev.organizador AND abs(d.data - ev.data) <= 3 OR lower(d.titulo) = lower(ev.titulo)))),
    c.email, ev.criado_em, ev.logo_url
   FROM agenda_eventos ev LEFT JOIN agenda_eventos_contatos c ON c.evento_id = ev.id
  WHERE ev.publicado = false AND ev.rejeitado = false AND (ev.data >= (CURRENT_DATE - 1) OR ev.data_a_confirmar);
