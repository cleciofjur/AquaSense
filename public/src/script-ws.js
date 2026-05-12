/**
 * AquaSense — script-ws.js
 *
 * Versão WebSocket: recebe dados do Arduino via servidor Node.js.
 * Substitui o script-real.js (Web Serial API) para funcionar em
 * qualquer navegador, sem necessidade de Chrome/Edge exclusivo.
 */

let nivel = 0;
let leituras = 0;
let ws = null;
let reconectando = false;

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

function getRisco(n) {
  if (n > 18) return { r: 1, label: "Seguro",   color: "#3de87a", dot: "verde"    };
  if (n > 10) return { r: 3, label: "Atenção",  color: "#f5c842", dot: "amarelo"  };
  return            { r: 5, label: "Perigo!",   color: "#ff5f6d", dot: "vermelho" };
}

function getHora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── ATUALIZA TODOS OS ELEMENTOS DO PAINEL ───────────────────────────────────

function atualizarPainel(distancia) {
  nivel = Number(distancia);
  leituras++;

  const risco   = getRisco(nivel);
  const hora    = getHora();
  const nivelStr = nivel.toFixed(1);

  // Nível numérico (múltiplos elementos)
  document.querySelectorAll('[id^="nivel-preview"]').forEach((el) => {
    el.textContent = nivelStr;
  });

  const nivelPreviewBig = document.getElementById("nivel-preview-big");
  if (nivelPreviewBig) {
    nivelPreviewBig.innerHTML = nivelStr + '<span class="hero-nivel-unit">cm</span>';
  }

  const nivelCm = document.getElementById("nivel-cm");
  if (nivelCm) nivelCm.textContent = nivelStr;

  // Gauge do hero
  const gaugeEl = document.getElementById("hero-gauge-fill");
  if (gaugeEl) gaugeEl.style.width = Math.min(nivel, 100) + "%";

  // Barra de nível no painel
  const barra = document.getElementById("barra-nivel");
  if (barra) {
    barra.style.width      = Math.min(nivel, 100) + "%";
    barra.style.background = `linear-gradient(90deg, ${risco.color}, ${risco.color}aa)`;
  }

  // Dots de status (cor dinâmica)
  ["status-dot", "card-dot-preview"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.background = risco.color;
  });

  // Textos de status
  ["status-texto", "status-preview-texto"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = risco.label;
  });

  // Nível de risco — texto
  const nivelRisco = document.getElementById("nivel-risco");
  if (nivelRisco) nivelRisco.textContent = `Nível ${risco.r} de 5 · ${risco.label}`;

  const riscoNumero = document.getElementById("risco-numero");
  if (riscoNumero) riscoNumero.textContent = risco.r;

  const riscoPreviewCard = document.getElementById("risco-preview-card");
  if (riscoPreviewCard) riscoPreviewCard.textContent = `${risco.r} / 5`;

  // Barras de risco
  for (let i = 1; i <= 5; i++) {
    const bar = document.getElementById(`risco-${i}`);
    if (!bar) continue;
    if (i <= risco.r) {
      bar.style.background  = risco.color;
      bar.style.boxShadow   = `0 0 8px ${risco.color}66`;
    } else {
      bar.style.background  = "rgba(255,255,255,0.06)";
      bar.style.boxShadow   = "none";
    }
  }

  // Timestamps
  const horaCard = document.getElementById("hora-card");
  if (horaCard) horaCard.textContent = hora;

  const ultimaAtualizacao = document.getElementById("ultima-atualizacao");
  if (ultimaAtualizacao) ultimaAtualizacao.textContent = `Última leitura: ${hora}`;

  // Contagem de leituras
  const leiturasHoje = document.getElementById("leituras-hoje");
  if (leiturasHoje) leiturasHoje.textContent = leituras;
}

// ─── ATUALIZA STATUS DO SENSOR (online / offline / reconectando) ──────────────

function setStatusSensor(texto, online = true) {
  const el = document.getElementById("sensor-status");
  if (el) el.textContent = texto;

  // Dot do card do sensor
  const dot = document.querySelector("#card-sensor .chip-dot");
  if (dot) dot.style.background = online ? "#3de87a" : "#ff5f6d";
}

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────

function conectarWebSocket() {
  // Conecta ao mesmo host/porta do servidor Node.js
  const url = `ws://${location.host}`;
  console.log(`🔌 Conectando ao WebSocket: ${url}`);

  ws = new WebSocket(url);

  ws.onopen = () => {
    reconectando = false;
    console.log("✅ WebSocket conectado");
    setStatusSensor("Online");
    atualizarBotao(true);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.tipo === "leitura") {
        atualizarPainel(msg.distancia);

        // Atualiza indicador de arduino
        const sensorStatus = document.getElementById("sensor-status");
        if (sensorStatus) sensorStatus.textContent = "Online";
      }

      if (msg.tipo === "conexao") {
        const status = msg.arduino_conectado ? "Online" : "Desconectado";
        setStatusSensor(status, msg.arduino_conectado);
        console.log(`Arduino: ${status}`);
      }

      if (msg.tipo === "status") {
        leituras = msg.leituras_totais || 0;
        const el = document.getElementById("leituras-hoje");
        if (el) el.textContent = leituras;
      }

      if (msg.tipo === "erro") {
        console.warn("Erro do servidor:", msg.mensagem);
      }
    } catch (e) {
      console.warn("Mensagem inválida:", event.data);
    }
  };

  ws.onclose = () => {
    if (!reconectando) {
      reconectando = true;
      setStatusSensor("Reconectando...", false);
      atualizarBotao(false);
      console.log("🔄 WebSocket fechado — tentando em 3s...");
      setTimeout(conectarWebSocket, 3000);
    }
  };

  ws.onerror = (err) => {
    console.error("Erro WebSocket:", err);
    setStatusSensor("Erro de conexão", false);
  };
}

// ─── BOTÃO (esconde quando conectado via WS — conexão é automática) ───────────

function atualizarBotao(conectado) {
  const btn = document.getElementById("btn-conectar-arduino");
  if (!btn) return;

  if (conectado) {
    btn.textContent   = "✅ Conectado via Node.js";
    btn.disabled      = true;
    btn.style.opacity = "0.6";
  } else {
    btn.textContent   = "🔄 Reconectando...";
    btn.disabled      = true;
  }
}

// O botão agora apenas informa — conexão é automática via WebSocket
const btnConectar = document.getElementById("btn-conectar-arduino");
if (btnConectar) {
  btnConectar.addEventListener("click", () => {
    alert("Conexão automática via WebSocket!\nGaranta que o servidor Node.js está rodando.");
  });
}

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("visible");
    });
  },
  { threshold: 0.1 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────

// Conecta assim que a página carrega
conectarWebSocket();
