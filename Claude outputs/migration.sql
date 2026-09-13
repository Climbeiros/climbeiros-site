-- 1) setores: slug para a página individual + campo de dicas de acesso
alter table public.setores
  add column if not exists slug text unique,
  add column if not exists como_chegar text;

update public.setores set slug = 'falesia-paraiso' where nome = 'Falésia Paraíso';
update public.setores set slug = 'gruta-do-bau' where nome = 'Gruta do Baú';
update public.setores set slug = 'milho-verde-setor-45' where nome = 'Milho Verde - Setor 45';
update public.setores set slug = 'milho-verde-setor-canelau' where nome = 'Milho Verde - Setor Canelau';
update public.setores set slug = 'milho-verde-setor-lado-b' where nome = 'Milho Verde - Setor Lado B';
update public.setores set slug = 'pedra-da-divisa' where nome = 'Pedra da Divisa';
update public.setores set slug = 'pedra-do-bau' where nome = 'Pedra do Baú';
update public.setores set slug = 'pedra-do-urubu' where nome = 'Pedra do Urubu';
update public.setores set slug = 'visual-das-aguas' where nome = 'Visual das Águas';

-- 2) hospedagens: inbox do formulário público + tabela curada (mesmo padrão de guias/inscricoes_guias)
create table if not exists public.inscricoes_hospedagens (
  id bigint generated always as identity primary key,
  nome text not null,
  contato_reserva text not null,
  link_reserva text,
  distancia text,
  setores_interesse text,
  tem_desconto text,
  desconto_codigo text,
  desconto_desc text,
  mensagem text,
  criado_em timestamptz default now()
);
alter table public.inscricoes_hospedagens enable row level security;
create policy "envio publico inscricoes_hospedagens" on public.inscricoes_hospedagens
  for insert to anon with check (true);

create table if not exists public.hospedagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato_reserva text,
  link_reserva text,
  distancia text,
  tem_desconto boolean default false,
  desconto_codigo text,
  desconto_desc text,
  setores_ids uuid[] default '{}',
  publicado boolean default false,
  ordem integer default 0,
  criado_em timestamptz default now()
);
alter table public.hospedagens enable row level security;
create policy "leitura publica hospedagens" on public.hospedagens
  for select to public using (publicado = true);

-- 3) guias: vincular a setores (mesmo padrão de array já usado em guias.especialidades)
alter table public.guias
  add column if not exists setores_ids uuid[] default '{}';

-- 4) avaliacoes_setores: mesmo padrão de avaliacoes_academias, + link de vídeo
create table if not exists public.avaliacoes_setores (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.setores(id),
  nome text not null,
  email text not null,
  nota smallint not null check (nota >= 1 and nota <= 5),
  comentario text,
  link_video text,
  aprovado boolean not null default false,
  enviado_em timestamptz not null default now()
);
alter table public.avaliacoes_setores enable row level security;
create policy "Qualquer pessoa pode enviar uma avaliação de setor" on public.avaliacoes_setores
  for insert to public with check (aprovado = false);

create view public.avaliacoes_setores_publicas as
  select id, setor_id, nome, nota, comentario, link_video, enviado_em
  from public.avaliacoes_setores
  where aprovado = true;

-- 5) fotos de avaliação: tabela própria, moderação independente (mesmo padrão de fotos_galeria)
create table if not exists public.avaliacoes_setores_fotos (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes_setores(id) on delete cascade,
  imagem_url text not null,
  aprovado boolean not null default false,
  enviado_em timestamptz not null default now()
);
alter table public.avaliacoes_setores_fotos enable row level security;
create policy "Qualquer pessoa pode enviar uma foto de avaliação" on public.avaliacoes_setores_fotos
  for insert to public with check (aprovado = false);

create view public.avaliacoes_setores_fotos_publicas as
  select id, avaliacao_id, imagem_url, enviado_em
  from public.avaliacoes_setores_fotos
  where aprovado = true;

-- 6) bucket de storage para as fotos de avaliação (mesmo padrão do bucket fotos-comunidade)
insert into storage.buckets (id, name, public)
  values ('fotos-avaliacoes-setores', 'fotos-avaliacoes-setores', true)
  on conflict (id) do nothing;

create policy "Qualquer pessoa pode enviar arquivo pro bucket fotos-avaliacoes-setores"
  on storage.objects for insert to public
  with check (bucket_id = 'fotos-avaliacoes-setores');

create policy "Qualquer pessoa pode ver arquivos do bucket fotos-avaliacoes-setores"
  on storage.objects for select to public
  using (bucket_id = 'fotos-avaliacoes-setores');
