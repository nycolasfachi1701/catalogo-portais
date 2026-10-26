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
-- PERMISSÕES — versão aberta (recomendada para começar)
-- Qualquer pessoa com o link do site pode ler E cadastrar/editar/remover.
-- Simples, sem login. Bom para um catálogo interno com URL não divulgada.
-- -----------------------------------------------------------------------------
drop policy if exists "portais_select" on public.portais;
drop policy if exists "portais_insert" on public.portais;
drop policy if exists "portais_update" on public.portais;
drop policy if exists "portais_delete" on public.portais;

create policy "portais_select" on public.portais for select using (true);
create policy "portais_insert" on public.portais for insert with check (true);
create policy "portais_update" on public.portais for update using (true) with check (true);
create policy "portais_delete" on public.portais for delete using (true);

-- -----------------------------------------------------------------------------
-- (OPCIONAL) Travar a edição para quem estiver logado
-- Se mais tarde você quiser que só pessoas autenticadas editem (e todo mundo
-- apenas leia), ative o Supabase Auth, remova as policies de escrita acima e
-- rode estas no lugar. A leitura continua pública.
--
--   drop policy if exists "portais_insert" on public.portais;
--   drop policy if exists "portais_update" on public.portais;
--   drop policy if exists "portais_delete" on public.portais;
--   create policy "portais_insert" on public.portais for insert to authenticated with check (true);
--   create policy "portais_update" on public.portais for update to authenticated using (true) with check (true);
--   create policy "portais_delete" on public.portais for delete to authenticated using (true);
-- -----------------------------------------------------------------------------

-- (OPCIONAL) Atualização ao vivo entre abas/pessoas
-- Para que uma mudança feita por alguém apareça na tela de quem já está com o
-- site aberto (sem recarregar), habilite o Realtime para esta tabela:
--   Supabase → Database → Replication → marque "portais".
-- Sem isso, o site ainda funciona: cada pessoa vê os dados ao abrir/recarregar.
