/* ==========================================================================
   Configuração do Supabase.
   Preencha os dois valores abaixo com os dados do SEU projeto Supabase:
     Painel do Supabase → Project Settings → API
       • SUPABASE_URL  = "Project URL"
       • SUPABASE_ANON_KEY = chave "anon public"

   A chave "anon public" é pública por design (protegida pelas policies de
   RLS definidas em schema.sql), então pode ficar no repositório sem problema.
   NÃO use aqui a chave "service_role" — essa é secreta.
   ========================================================================== */

window.ATUA_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
