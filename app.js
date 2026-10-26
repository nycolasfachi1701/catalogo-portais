/* ==========================================================================
   Catálogo Atua — lógica da aplicação
   Lê/escreve portais no Supabase e renderiza os cards.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.ATUA_CONFIG || {};
  var configurado = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("http") === 0;

  var $ = function (id) { return document.getElementById(id); };

  // Sem config → mostra a tela de setup e para por aqui.
  if (!configurado) {
    $("setup").hidden = false;
    return;
  }
  $("app").hidden = false;

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      flowType: "implicit",      // link mágico volta com a sessão no hash da URL
      detectSessionInUrl: true,  // detecta e aplica a sessão ao voltar do e-mail
      persistSession: true,
      autoRefreshToken: true
    }
  });

  var STATUS_LABEL = { ativo: "Ativo", dev: "Em desenvolvimento", off: "Descontinuado" };
  var ICON_LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var ICON_DEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';

  var portais = [];
  var catAtiva = "Todos";
  var busca = "";
  var carregado = false;
  var editId = null;      // id do portal em edição, ou null para novo
  var confirmandoRemocao = false;
  var podeEditar = false;  // true quando há sessão autenticada

  // ---------- util ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function normalizaUrl(u) {
    if (!u) return "";
    u = u.trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) return "https://" + u;
    return u;
  }
  function toast(msg, tipo) {
    var box = document.createElement("div");
    box.className = "toast " + (tipo || "");
    box.textContent = msg;
    $("toasts").appendChild(box);
    setTimeout(function () {
      box.style.transition = "opacity .3s";
      box.style.opacity = "0";
      setTimeout(function () { box.remove(); }, 300);
    }, tipo === "err" ? 5000 : 3000);
  }

  // ---------- dados ----------
  function carregar() {
    sb.from("portais").select("*").then(function (res) {
      carregado = true;
      if (res.error) {
        $("loading").hidden = true;
        toast("Erro ao carregar: " + res.error.message, "err");
        console.error(res.error);
        return;
      }
      portais = (res.data || []).slice().sort(function (a, b) {
        var ca = a.criado_em || "", cb = b.criado_em || "";
        if (ca !== cb) return ca < cb ? -1 : 1;
        return (a.nome || "").localeCompare(b.nome || "");
      });
      render();
    });
  }

  // Atualização ao vivo entre quem estiver com a página aberta (se o Realtime
  // estiver habilitado para a tabela no Supabase). Degrada sem erro se não.
  function assinarRealtime() {
    try {
      sb.channel("portais-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "portais" }, function () {
          carregar();
        })
        .subscribe();
    } catch (e) { /* sem realtime, tudo bem */ }
  }

  // ---------- render ----------
  function categorias() {
    var set = {};
    portais.forEach(function (p) { if (p.categoria) set[p.categoria] = true; });
    return Object.keys(set).sort();
  }

  function renderFiltros() {
    var box = $("filters");
    var cats = ["Todos"].concat(categorias());
    if (cats.indexOf(catAtiva) === -1) catAtiva = "Todos";
    box.innerHTML = "";
    cats.forEach(function (cat) {
      var b = document.createElement("button");
      b.className = "pill";
      b.textContent = cat;
      b.setAttribute("aria-pressed", cat === catAtiva ? "true" : "false");
      b.addEventListener("click", function () {
        catAtiva = cat;
        renderFiltros();
        renderGrid();
      });
      box.appendChild(b);
    });
  }

  function renderContadores() {
    $("c-total").textContent = portais.length;
    $("c-ativos").textContent = portais.filter(function (p) { return p.status === "ativo"; }).length;
    $("c-cat").textContent = categorias().length;
    $("foot-count").textContent = portais.length + (portais.length === 1 ? " portal" : " portais");
  }

  function cardHTML(p) {
    var status = STATUS_LABEL[p.status] ? p.status : "ativo";
    var url = normalizaUrl(p.url);
    var urlTxt = url || "URL a cadastrar";
    var go = url
      ? '<a class="go" href="' + esc(url) + '" target="_blank" rel="noopener">Acessar ' + ICON_LINK + "</a>"
      : '<span class="go" aria-disabled="true">Acessar ' + ICON_LINK + "</span>";
    return '<article class="card">' +
      '<div class="card-top">' +
        '<span class="eyebrow">' + esc(p.categoria || "Geral") + "</span>" +
        '<span class="badge ' + status + '"><span class="d"></span>' + STATUS_LABEL[status] + "</span>" +
      "</div>" +
      "<h2>" + esc(p.nome) + "</h2>" +
      (p.descricao ? "<p>" + esc(p.descricao) + "</p>" : "") +
      '<div class="meta">' +
        (p.publico ? '<span class="tag">Público: <b>' + esc(p.publico) + "</b></span>" : "") +
        (p.responsavel ? '<span class="tag">Resp.: <b>' + esc(p.responsavel) + "</b></span>" : "") +
      "</div>" +
      '<div class="card-foot card-foot-top">' +
        '<span class="url" title="' + esc(urlTxt) + '">' + esc(urlTxt) + "</span>" +
        '<div class="foot-actions">' +
          (podeEditar
            ? '<button class="icon-btn" data-edit="' + esc(p.id) + '" aria-label="Editar" title="Editar">' + ICON_EDIT + "</button>" +
              '<button class="icon-btn danger" data-del="' + esc(p.id) + '" aria-label="Remover" title="Remover">' + ICON_DEL + "</button>"
            : "") +
          go +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function renderGrid() {
    var q = busca.trim().toLowerCase();
    var lista = portais.filter(function (p) {
      var okCat = catAtiva === "Todos" || p.categoria === catAtiva;
      var hay = (p.nome + " " + (p.descricao || "") + " " + (p.categoria || "") + " " + (p.publico || "")).toLowerCase();
      var okQ = !q || hay.indexOf(q) !== -1;
      return okCat && okQ;
    });

    var grid = $("grid");
    var ghostHTML = podeEditar
      ? '<button class="card ghost" id="ghost"><span class="plus">+</span><span>Cadastrar novo portal</span></button>'
      : "";
    grid.innerHTML = lista.map(cardHTML).join("") + ghostHTML;

    $("noresult").hidden = lista.length > 0 || portais.length === 0;

    grid.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { abrirModal(b.getAttribute("data-edit")); });
    });
    grid.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { removerDireto(b.getAttribute("data-del")); });
    });
    var ghost = $("ghost");
    if (ghost) ghost.addEventListener("click", function () { abrirModal(null); });
  }

  function render() {
    $("loading").hidden = true;
    renderContadores();
    renderFiltros();
    if (portais.length === 0) {
      $("empty").hidden = false;
      $("grid").hidden = true;
      $("noresult").hidden = true;
      $("btn-primeiro").hidden = !podeEditar;
      $("empty-text").textContent = podeEditar
        ? "Comece adicionando o primeiro portal do Atua — Portal de Processos, CIOT ANTT, a landing da consultoria, o que vier."
        : "Ainda não há portais no catálogo. Entre para editar e adicione o primeiro.";
    } else {
      $("empty").hidden = true;
      $("grid").hidden = false;
      renderGrid();
    }
  }

  // ---------- modal ----------
  function abrirModal(id) {
    if (!podeEditar) { abrirLogin(); return; }
    editId = id || null;
    confirmandoRemocao = false;
    var p = editId ? portais.filter(function (x) { return String(x.id) === String(editId); })[0] : null;

    $("modal-title").textContent = p ? "Editar portal" : "Novo portal";
    $("f-nome").value = p ? (p.nome || "") : "";
    $("f-categoria").value = p ? (p.categoria || "") : "";
    $("f-status").value = p && STATUS_LABEL[p.status] ? p.status : "ativo";
    $("f-publico").value = p ? (p.publico || "") : "";
    $("f-responsavel").value = p ? (p.responsavel || "") : "";
    $("f-url").value = p ? (p.url || "") : "";
    $("f-descricao").value = p ? (p.descricao || "") : "";

    var rem = $("btn-remover");
    rem.hidden = !p;
    rem.textContent = "Remover";
    rem.classList.remove("btn-primary");

    $("overlay").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { $("f-nome").focus(); }, 30);
  }

  function fecharModal() {
    $("overlay").hidden = true;
    document.body.style.overflow = "";
    editId = null;
  }

  function coletar() {
    return {
      nome: $("f-nome").value.trim(),
      categoria: $("f-categoria").value.trim() || "Geral",
      status: $("f-status").value,
      publico: $("f-publico").value.trim() || null,
      responsavel: $("f-responsavel").value.trim() || null,
      url: $("f-url").value.trim() || null,
      descricao: $("f-descricao").value.trim() || null
    };
  }

  function salvar(ev) {
    ev.preventDefault();
    if (!podeEditar) { toast("Entre para editar.", "err"); return; }
    var dados = coletar();
    if (!dados.nome) { toast("Dê um nome ao portal.", "err"); $("f-nome").focus(); return; }

    var btn = $("btn-salvar");
    btn.disabled = true;
    btn.textContent = "Salvando…";

    var op = editId
      ? sb.from("portais").update(dados).eq("id", editId)
      : sb.from("portais").insert(dados);

    op.then(function (res) {
      btn.disabled = false;
      btn.textContent = "Salvar";
      if (res.error) {
        toast("Não foi possível salvar: " + res.error.message, "err");
        console.error(res.error);
        return;
      }
      toast(editId ? "Portal atualizado." : "Portal cadastrado.", "ok");
      fecharModal();
      carregar();
    });
  }

  function removerNoModal() {
    if (!editId) return;
    if (!confirmandoRemocao) {
      confirmandoRemocao = true;
      var rem = $("btn-remover");
      rem.textContent = "Confirmar remoção?";
      rem.classList.add("btn-primary");
      return;
    }
    var id = editId;
    sb.from("portais").delete().eq("id", id).then(function (res) {
      if (res.error) { toast("Erro ao remover: " + res.error.message, "err"); return; }
      toast("Portal removido.", "ok");
      fecharModal();
      carregar();
    });
  }

  // Remoção direto pelo card (ícone de lixeira) com confirmação em dois cliques.
  var pendenteDel = null, pendenteTimer = null;
  function removerDireto(id) {
    if (pendenteDel === id) {
      clearTimeout(pendenteTimer);
      pendenteDel = null;
      sb.from("portais").delete().eq("id", id).then(function (res) {
        if (res.error) { toast("Erro ao remover: " + res.error.message, "err"); return; }
        toast("Portal removido.", "ok");
        carregar();
      });
      return;
    }
    pendenteDel = id;
    toast("Clique na lixeira de novo para confirmar a remoção.", "");
    clearTimeout(pendenteTimer);
    pendenteTimer = setTimeout(function () { pendenteDel = null; }, 4000);
  }

  // ---------- auth ----------
  function atualizaAuthUI(session) {
    podeEditar = !!session;
    var email = session && session.user ? (session.user.email || "") : "";
    $("btn-novo").hidden = !podeEditar;
    $("btn-entrar").hidden = podeEditar;
    $("userchip").hidden = !podeEditar;
    if (podeEditar) $("useremail").textContent = email;
    if (!podeEditar && !$("overlay").hidden) fecharModal();
  }

  function abrirLogin() {
    $("login-overlay").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { $("l-email").focus(); }, 30);
  }
  function fecharLogin() {
    $("login-overlay").hidden = true;
    document.body.style.overflow = "";
  }

  function entrarComSenha(ev) {
    ev.preventDefault();
    var email = $("l-email").value.trim();
    var senha = $("l-senha").value;
    if (!email || !senha) return;
    var btn = $("login-enviar");
    btn.disabled = true; btn.textContent = "Entrando…";
    sb.auth.signInWithPassword({ email: email, password: senha }).then(function (res) {
      btn.disabled = false; btn.textContent = "Entrar";
      if (res.error) {
        var m = res.error.message || "";
        var msg = /invalid login|credentials|invalid/i.test(m)
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar: " + m;
        toast(msg, "err");
        return;
      }
      $("l-senha").value = "";
      fecharLogin();
      toast("Tudo certo! Você já pode editar.", "ok");
    });
  }

  function sair() {
    sb.auth.signOut().then(function () { toast("Você saiu.", ""); });
  }

  // ---------- eventos ----------
  $("q").addEventListener("input", function () { busca = this.value; if (carregado && portais.length) renderGrid(); });
  $("btn-novo").addEventListener("click", function () { abrirModal(null); });
  $("btn-primeiro").addEventListener("click", function () { abrirModal(null); });
  $("modal-close").addEventListener("click", fecharModal);
  $("btn-cancelar").addEventListener("click", fecharModal);
  $("btn-remover").addEventListener("click", removerNoModal);
  $("form").addEventListener("submit", salvar);
  $("overlay").addEventListener("click", function (e) { if (e.target === $("overlay")) fecharModal(); });
  $("btn-entrar").addEventListener("click", abrirLogin);
  $("btn-sair").addEventListener("click", sair);
  $("login-close").addEventListener("click", fecharLogin);
  $("login-cancelar").addEventListener("click", fecharLogin);
  $("login-form").addEventListener("submit", entrarComSenha);
  $("login-overlay").addEventListener("click", function (e) { if (e.target === $("login-overlay")) fecharLogin(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("overlay").hidden) fecharModal();
    else if (!$("login-overlay").hidden) fecharLogin();
  });

  // tema
  $("theme").addEventListener("click", function () {
    var root = document.documentElement;
    var cur = root.getAttribute("data-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var now = cur || (prefersDark ? "dark" : "light");
    var next = now === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("atua-tema", next); } catch (e) {}
  });
  try {
    var temaSalvo = localStorage.getItem("atua-tema");
    if (temaSalvo) document.documentElement.setAttribute("data-theme", temaSalvo);
  } catch (e) {}

  // ---------- start ----------
  sb.auth.onAuthStateChange(function (_event, session) {
    atualizaAuthUI(session);
    if (carregado) render();
  });
  sb.auth.getSession().then(function (res) {
    atualizaAuthUI(res && res.data ? res.data.session : null);
    if (carregado) render();
  });
  carregar();
  assinarRealtime();
})();
