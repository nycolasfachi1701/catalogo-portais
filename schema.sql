-- ============================================================================
-- Catálogo Atua — estrutura do banco no Supabase
-- Cole e rode este arquivo inteiro no Supabase: painel → SQL Editor → New query.
-- ============================================================================

-- Tabela de portais ----------------------------------------------------------
create table if not exists public.portais (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  categoria   text not null default 'Geral',
  status      text not null default 'ativo',   -- 'ativo' | 'dev' | 'off'
  publico     text,
  descricao   text,
  url         text,
  responsavel text,
  criado_em   timestamptz not null default now()
);

-- Row Level Security ---------------------------------------------------------
alter table public.portais enable row level security;

-- -----------------------------------------------------------------------------
-- PERMISSÕES — edição só para quem está logado
-- Todo mundo lê o catálogo; apenas usuários autenticados (login por link
-- mágico) podem cadastrar, editar e remover. Quem edita você controla
-- liberando os e-mails no Supabase (veja o README).
-- -----------------------------------------------------------------------------
drop policy if exists "portais_select" on public.portais;
drop policy if exists "portais_insert" on public.portais;
drop policy if exists "portais_update" on public.portais;
drop policy if exists "portais_delete" on public.portais;

-- Leitura pública
create policy "portais_select" on public.portais for select using (true);

-- Escrita apenas para usuários autenticados
create policy "portais_insert" on public.portais for insert to authenticated with check (true);
create policy "portais_update" on public.portais for update to authenticated using (true) with check (true);
create policy "portais_delete" on public.portais for delete to authenticated using (true);

-- -----------------------------------------------------------------------------
-- (ALTERNATIVA) Versão totalmente aberta, sem login
-- Se um dia quiser dispensar o login e deixar qualquer um editar, troque as
-- três policies de escrita acima por estas:
--
--   create policy "portais_insert" on public.portais for insert with check (true);
--   create policy "portais_update" on public.portais for update using (true) with check (true);
--   create policy "portais_delete" on public.portais for delete using (true);
-- -----------------------------------------------------------------------------

-- (OPCIONAL) Atualização ao vivo entre abas/pessoas
-- Para que uma mudança feita por alguém apareça na tela de quem já está com o
-- site aberto (sem recarregar), habilite o Realtime para esta tabela:
--   Supabase → Database → Replication → marque "portais".
-- Sem isso, o site ainda funciona: cada pessoa vê os dados ao abrir/recarregar.
