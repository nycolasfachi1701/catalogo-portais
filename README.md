# Catálogo Atua

Catálogo central dos portais do Atua (nstech) — Portal de Processos, CIOT ANTT,
landing da consultoria e demais páginas — em uma capa única, com busca, filtros
por categoria e cadastro/edição/remoção ao vivo.

Site estático (HTML + CSS + JS), sem build. Os dados ficam no **Supabase** e o
deploy é no **Vercel**.

---

## Como funciona

- `index.html` · `styles.css` · `app.js` — o site.
- `config.js` — suas credenciais do Supabase (você preenche).
- `schema.sql` — cria a tabela `portais` e as permissões no Supabase.

Qualquer pessoa com o link **lê** o catálogo. Para **cadastrar, editar ou
remover** é preciso entrar com **e-mail e senha** (Supabase Auth). Você
controla quem pode editar criando os usuários.

---

## Passo a passo

### 1. Criar o banco (Supabase)

1. Crie uma conta grátis em **https://supabase.com** e um novo projeto.
2. No menu lateral, abra **SQL Editor → New query**, cole todo o conteúdo de
   [`schema.sql`](schema.sql) e clique em **Run**.
3. Abra **Project Settings → API** e copie:
   - **Project URL** (ex.: `https://abcd1234.supabase.co`)
   - Chave **anon public** (a longa, em "Project API keys").

> A chave **anon public** pode ficar no repositório — ela é pública por design
> e protegida pelas regras de RLS do `schema.sql`. **Nunca** use aqui a chave
> `service_role` (essa é secreta).

### 2. Criar o seu login (e-mail + senha)

A leitura é pública; cadastrar/editar/remover exige entrar com e-mail e senha.
Como em geral só você edita, basta criar um usuário:

1. No Supabase, vá em **Authentication → Users → Add user**.
2. Preencha **e-mail** e **senha**, marque **Auto Confirm User** e crie.
3. No site, clique em **Entrar para editar** e use esse e-mail e senha.

Para liberar outra pessoa depois, crie outro usuário do mesmo jeito. Não
precisa de link mágico nem configurar URLs de redirecionamento.

### 3. Preencher o `config.js`

Abra [`config.js`](config.js) e cole os dois valores:

```js
window.ATUA_CONFIG = {
  SUPABASE_URL: "https://abcd1234.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...sua-chave..."
};
```

### 4. Publicar no Vercel

1. Em **https://vercel.com**, entre com o GitHub e clique **Add New → Project**.
2. Importe o repositório **`catalogo-portais`**.
3. Em *Framework Preset*, deixe **Other** (é site estático, sem build).
   - Build Command: *(vazio)*
   - Output Directory: *(vazio / raiz)*
4. **Deploy**. Pronto — a cada `git push`, o Vercel republica sozinho.

### 5. (Opcional) Atualização ao vivo entre pessoas

No Supabase, abra **Database → Replication** e habilite a tabela `portais`.
Assim, uma mudança feita por alguém aparece na tela de quem já está com o site
aberto, sem recarregar.

---

## Rodar localmente

Como o `index.html` carrega `config.js` e `app.js`, use um servidor estático
(abrir o arquivo direto com `file://` também funciona, mas servidor é melhor):

```bash
npx serve .
```

---

## Segurança

- A **leitura** do catálogo é pública (qualquer um com o link vê).
- A **edição** exige login, e só os usuários que você criar no Supabase
  (e-mail + senha) conseguem entrar (passo 2). As policies de RLS do
  [`schema.sql`](schema.sql) barram qualquer escrita de quem não está autenticado.
- A chave `anon public` no `config.js` é segura de expor — ela não dá poder de
  escrita sozinha. Nunca coloque a chave `service_role` no projeto.
- Para voltar ao modo aberto (sem login), use a alternativa no fim do
  [`schema.sql`](schema.sql).
