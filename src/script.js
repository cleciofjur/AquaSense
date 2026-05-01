/* ── SENSOR SIMULATION ── */
let nivel = 28;
let leituras = 0;

function getRisco(n) {
  if (n < 30) return { r: 1, label: "Normal", color: "#3de87a", dot: "verde" };
  if (n < 50) return { r: 2, label: "Baixo", color: "#90d87a", dot: "verde" };
  if (n < 70)
    return { r: 3, label: "Atenção", color: "#f5c842", dot: "amarelo" };
  if (n < 85) return { r: 4, label: "Alto", color: "#ff8c42", dot: "vermelho" };
  return { r: 5, label: "Perigo!", color: "#ff5f6d", dot: "vermelho" };
}

function update() {
  nivel += (Math.random() - 0.48) * 5;
  nivel = Math.max(5, Math.min(100, nivel));
  leituras++;

  const risco = getRisco(nivel);
  const now = new Date();
  const hora = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /* Nivel values */
  const nivelStr = nivel.toFixed(1);
  const pct = nivel.toFixed(0) + "%";

  document
    .querySelectorAll('[id^="nivel-preview"]')
    .forEach((el) => (el.textContent = nivelStr));
  document.getElementById("nivel-preview-big").innerHTML =
    nivelStr + '<span class="hero-nivel-unit">cm</span>';

  /* Gauge */
  const gaugeEl = document.getElementById("hero-gauge-fill");
  if (gaugeEl) gaugeEl.style.width = Math.min(nivel, 100) + "%";

  /* Level bar */
  const barra = document.getElementById("barra-nivel");
  if (barra) {
    barra.style.width = Math.min(nivel, 100) + "%";
    barra.style.background = `linear-gradient(90deg, ${risco.color}, ${risco.color}aa)`;
  }

  /* Status dots + text */
  ["status-dot", "card-dot-preview"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.background = risco.color;
  });

  ["status-texto", "status-preview-texto"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = risco.label;
  });

  document.getElementById("nivel-cm").textContent = nivelStr;
  document.getElementById("nivel-risco").textContent =
    `Nível ${risco.r} de 5 · ${risco.label}`;
  document.getElementById("risco-numero").textContent = risco.r;
  document.getElementById("risco-preview-card").textContent = `${risco.r} / 5`;
  document.getElementById("hora-card").textContent = hora;
  document.getElementById("ultima-atualizacao").textContent =
    `Última leitura: ${hora}`;
  document.getElementById("leituras-hoje").textContent = leituras;

  /* Risco bars */
  for (let i = 1; i <= 5; i++) {
    const bar = document.getElementById(`risco-${i}`);
    if (!bar) continue;
    if (i <= risco.r) {
      bar.style.background = risco.color;
      bar.style.boxShadow = `0 0 8px ${risco.color}66`;
    } else {
      bar.style.background = "rgba(255,255,255,0.06)";
      bar.style.boxShadow = "none";
    }
  }
}

update();
setInterval(update, 2500);

/* ── SCROLL REVEAL ── */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
