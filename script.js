/* Respiração e fígado — interações da página
 * 1. "Letra maior": aumenta o texto da página toda (lembra a escolha neste aparelho).
 * 2. "Ouvir esta parte": lê a seção em voz alta com a voz do próprio celular/computador.
 * 3. Barra fixa "Quero participar" no celular, depois que o botão principal sai da tela.
 * 4. Link do WhatsApp com o endereço real desta página.
 */
(function () {
  "use strict";

  var raiz = document.documentElement;

  /* ---------- 1. Letra maior ---------- */
  var botaoLetra = document.querySelector("[data-letra]");
  var CHAVE_LETRA = "respiracao-cirrose:letra-maior";

  function aplicarLetra(ligada) {
    raiz.classList.toggle("letra-maior", ligada);
    if (botaoLetra) botaoLetra.setAttribute("aria-pressed", ligada ? "true" : "false");
  }

  try {
    aplicarLetra(window.localStorage.getItem(CHAVE_LETRA) === "1");
  } catch (e) { /* armazenamento indisponível: segue com a letra padrão */ }

  if (botaoLetra) {
    botaoLetra.addEventListener("click", function () {
      var ligada = !raiz.classList.contains("letra-maior");
      aplicarLetra(ligada);
      try { window.localStorage.setItem(CHAVE_LETRA, ligada ? "1" : "0"); } catch (e) {}
    });
  }

  /* ---------- 2. Ouvir esta parte ---------- */
  var fala = window.speechSynthesis;
  var botoesOuvir = Array.prototype.slice.call(document.querySelectorAll("[data-ouvir]"));

  if (!fala || typeof window.SpeechSynthesisUtterance !== "function") {
    raiz.classList.add("sem-voz");
  } else {
    var vozPt = null;
    var botaoAtivo = null;
    var fila = [];

    var escolherVoz = function () {
      var vozes = fala.getVoices() || [];
      var norm = function (v) { return (v.lang || "").replace("_", "-").toLowerCase(); };
      vozPt = vozes.filter(function (v) { return norm(v) === "pt-br"; })[0] ||
              vozes.filter(function (v) { return norm(v).indexOf("pt") === 0; })[0] || null;
    };
    escolherVoz();
    if (typeof fala.addEventListener === "function") fala.addEventListener("voiceschanged", escolherVoz);

    var textoDaSecao = function (secao) {
      var partes = [];
      var blocos = secao.querySelectorAll("h1, h2, h3, h4, p, dt, dd, summary");
      Array.prototype.forEach.call(blocos, function (el) {
        if (el.closest("[data-nao-ler]")) return;
        var t = (el.textContent || "").replace(/\s+/g, " ").replace(/\s*\([^)]*\)/g, "").trim();
        if (!t) return;
        if (el.tagName === "DT") { partes.push(t + ":"); return; }
        if (!/[.!?:]$/.test(t)) t += ".";
        partes.push(t);
      });
      return partes.join(" ");
    };

    // Frases curtas: alguns navegadores cortam falas longas no meio.
    var picotar = function (texto) {
      var frases = texto.match(/[^.!?:]+[.!?:]+/g) || [texto];
      var pedacos = [];
      var atual = "";
      frases.forEach(function (f) {
        if ((atual + f).length > 180 && atual) { pedacos.push(atual.trim()); atual = ""; }
        atual += f;
      });
      if (atual.trim()) pedacos.push(atual.trim());
      return pedacos;
    };

    var marcarBotao = function (botao, falando) {
      botao.setAttribute("aria-pressed", falando ? "true" : "false");
      var rotulo = botao.querySelector("[data-ouvir-rotulo]");
      if (rotulo) rotulo.textContent = falando ? "Parar de ouvir" : "Ouvir esta parte";
    };

    var parar = function () {
      fila = [];
      fala.cancel();
      if (botaoAtivo) marcarBotao(botaoAtivo, false);
      botaoAtivo = null;
    };

    var falarProximo = function () {
      if (!fila.length) { if (botaoAtivo) marcarBotao(botaoAtivo, false); botaoAtivo = null; return; }
      var u = new window.SpeechSynthesisUtterance(fila.shift());
      u.lang = "pt-BR";
      if (vozPt) u.voice = vozPt;
      u.rate = 0.92;
      u.onend = falarProximo;
      u.onerror = parar;
      fala.speak(u);
    };

    botoesOuvir.forEach(function (botao) {
      botao.setAttribute("aria-pressed", "false");
      botao.addEventListener("click", function () {
        var mesmo = botaoAtivo === botao;
        parar();
        if (mesmo) return;
        var secao = document.getElementById(botao.getAttribute("data-ouvir"));
        if (!secao) return;
        fila = picotar(textoDaSecao(secao));
        botaoAtivo = botao;
        marcarBotao(botao, true);
        falarProximo();
      });
    });

    window.addEventListener("pagehide", parar);
  }

  /* ---------- 3. Barra fixa no celular ---------- */
  var barra = document.querySelector("[data-barra]");
  var ctaPrincipal = document.querySelector("[data-cta-principal]");
  var ctaFinal = document.querySelector("[data-cta-final]");

  if (barra && ctaPrincipal && "IntersectionObserver" in window) {
    barra.hidden = false;
    var principalVisivel = true;
    var finalVisivel = false;
    var atualizar = function () {
      barra.classList.toggle("is-visivel", !principalVisivel && !finalVisivel);
    };
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.target === ctaPrincipal) principalVisivel = en.isIntersecting || en.boundingClientRect.top > 0;
        if (en.target === ctaFinal) finalVisivel = en.isIntersecting;
      });
      atualizar();
    });
    observador.observe(ctaPrincipal);
    if (ctaFinal) observador.observe(ctaFinal);
  }

  /* ---------- 4. WhatsApp com o endereço real ---------- */
  var zap = document.querySelector("[data-whatsapp]");
  if (zap && /^https?:/.test(window.location.protocol)) {
    var endereco = window.location.origin + window.location.pathname;
    var msg = "Pesquisa do HULW sobre respiração e doença no fígado: avaliação gratuita, em um único encontro. Veja: " + endereco;
    zap.href = "https://wa.me/?text=" + encodeURIComponent(msg);
  }
})();
