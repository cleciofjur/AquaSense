let nivel = 0;
let leituras = 0;
let port;
let reader;

function getRisco(n) {
  if (n > 18) return { r: 1, label: "Seguro", color: "#3de87a", dot: "verde" };
  if (n > 10)
    return { r: 3, label: "Atenção", color: "#f5c842", dot: "amarelo" };
  return { r: 5, label: "Perigo!", color: "#ff5f6d", dot: "vermelho" };
}

function atualizarPainel(distancia) {
  nivel = Number(distancia);
  leituras++;

  const risco = getRisco(nivel);

  const now = new Date();
  const hora = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const nivelStr = nivel.toFixed(1);

  document
    .querySelectorAll('[id^="nivel-preview"]')
    .forEach((el) => (el.textContent = nivelStr));

  const nivelPreviewBig = document.getElementById("nivel-preview-big");
  if (nivelPreviewBig) {
    nivelPreviewBig.innerHTML =
      nivelStr + '<span class="hero-nivel-unit">cm</span>';
  }

  const gaugeEl = document.getElementById("hero-gauge-fill");
  if (gaugeEl) {
    gaugeEl.style.width = Math.min(nivel, 100) + "%";
  }

  const barra = document.getElementById("barra-nivel");
  if (barra) {
    barra.style.width = Math.min(nivel, 100) + "%";
    barra.style.background = `linear-gradient(90deg, ${risco.color}, ${risco.color}aa)`;
  }

  ["status-dot", "card-dot-preview"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.background = risco.color;
  });

  ["status-texto", "status-preview-texto"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = risco.label;
  });

  const nivelCm = document.getElementById("nivel-cm");
  if (nivelCm) nivelCm.textContent = nivelStr;

  const nivelRisco = document.getElementById("nivel-risco");
  if (nivelRisco) {
    nivelRisco.textContent = `Nível ${risco.r} de 5 · ${risco.label}`;
  }

  const riscoNumero = document.getElementById("risco-numero");
  if (riscoNumero) riscoNumero.textContent = risco.r;

  const riscoPreviewCard = document.getElementById("risco-preview-card");
  if (riscoPreviewCard) riscoPreviewCard.textContent = `${risco.r} / 5`;

  const horaCard = document.getElementById("hora-card");
  if (horaCard) horaCard.textContent = hora;

  const ultimaAtualizacao = document.getElementById("ultima-atualizacao");
  if (ultimaAtualizacao) {
    ultimaAtualizacao.textContent = `Última leitura: ${hora}`;
  }

  const leiturasHoje = document.getElementById("leituras-hoje");
  if (leiturasHoje) leiturasHoje.textContent = leituras;

  const sensorStatus = document.getElementById("sensor-status");
  if (sensorStatus) sensorStatus.textContent = "Online";

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

async function conectarArduino() {
  if (!("serial" in navigator)) {
    alert(
      "Seu navegador não suporta Web Serial API. Use Google Chrome ou Microsoft Edge.",
    );
    return;
  }

  try {
    port = await navigator.serial.requestPort();

    await port.open({
      baudRate: 9600,
    });

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);

    reader = decoder.readable.getReader();

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += value;

      const linhas = buffer.split("\n");
      buffer = linhas.pop();

      for (const linha of linhas) {
        const texto = linha.trim();

        if (!texto) continue;

        try {
          const dados = JSON.parse(texto);

          if (dados.distancia !== undefined) {
            atualizarPainel(dados.distancia);
          }
        } catch (erro) {
          console.warn("Linha ignorada:", texto);
        }
      }
    }
  } catch (erro) {
    console.error("Erro ao conectar com Arduino:", erro);
    alert(
      "Não foi possível conectar ao Arduino. Verifique a porta e tente novamente.",
    );
  }
}

const btnConectar = document.getElementById("btn-conectar-arduino");

if (btnConectar) {
  btnConectar.addEventListener("click", conectarArduino);
}

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
