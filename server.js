/**
 * AquaSense — Servidor Node.js
 *
 * Responsabilidades:
 *  1. Ler dados do Arduino via porta serial (SerialPort)
 *  2. Transmitir os dados em tempo real ao navegador via WebSocket (ws)
 *  3. Servir o front-end estático (Express)
 */

const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

// ─── CONFIGURAÇÕES ───────────────────────────────────────────────────────────

const HTTP_PORT = 3000; // Porta do servidor web

// Porta serial do Arduino.
// Windows  → "COM3", "COM4", etc.  (veja no Gerenciador de Dispositivos)
// Linux    → "/dev/ttyUSB0" ou "/dev/ttyACM0"
// macOS    → "/dev/cu.usbmodem..." ou "/dev/cu.usbserial..."
const SERIAL_PORT = process.env.SERIAL_PORT || autoDetectPort();
const BAUD_RATE = 9600; // Deve ser igual ao Serial.begin() do Arduino

// ─── DETECÇÃO AUTOMÁTICA DE PORTA ────────────────────────────────────────────

async function autoDetectPort() {
  // Não é chamada diretamente como async aqui — usada abaixo de forma síncrona
  // como fallback. Listagem real acontece em initSerial().
  return null;
}

// ─── EXPRESS (SERVIDOR WEB) ───────────────────────────────────────────────────

const app = express();

// Serve a pasta "public" onde ficam index.html, style.css, script.js
app.use(express.static(path.join(__dirname, "public")));

// Rota de status — útil para confirmar que o servidor está de pé
app.get("/status", (req, res) => {
  res.json({
    servidor: "online",
    porta_serial: currentPort || "não conectado",
    arduino_conectado: arduinoConectado,
    leituras_totais: leiturasTotal,
    ultima_leitura: ultimaLeitura,
  });
});

// Rota para listar portas seriais disponíveis (útil para debug)
app.get("/portas", async (req, res) => {
  try {
    const portas = await SerialPort.list();
    res.json(portas);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

const httpServer = http.createServer(app);

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer });

// Guarda todos os clientes conectados
const clientes = new Set();

wss.on("connection", (ws) => {
  clientes.add(ws);
  console.log(`🌐 Navegador conectado. Total: ${clientes.size}`);

  // Envia o status atual imediatamente ao novo cliente
  ws.send(
    JSON.stringify({
      tipo: "status",
      arduino_conectado: arduinoConectado,
      ultima_leitura: ultimaLeitura,
      leituras_totais: leiturasTotal,
    })
  );

  ws.on("close", () => {
    clientes.delete(ws);
    console.log(`🌐 Navegador desconectado. Total: ${clientes.size}`);
  });

  ws.on("error", (err) => {
    console.error("Erro no WebSocket:", err.message);
    clientes.delete(ws);
  });
});

// Envia uma mensagem para TODOS os navegadores conectados
function broadcast(dados) {
  const msg = JSON.stringify(dados);
  for (const ws of clientes) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}

// ─── SERIALPORT (ARDUINO) ─────────────────────────────────────────────────────

let arduinoConectado = false;
let leiturasTotal = 0;
let ultimaLeitura = null;
let currentPort = null;
let portInstance = null;

async function initSerial() {
  // 1. Lista todas as portas disponíveis no sistema
  let portas;
  try {
    portas = await SerialPort.list();
  } catch (e) {
    console.error("❌ Erro ao listar portas seriais:", e.message);
    return;
  }

  console.log("\n📋 Portas seriais disponíveis:");
  portas.forEach((p) => {
    console.log(`   • ${p.path}${p.manufacturer ? " — " + p.manufacturer : ""}`);
  });

  // 2. Tenta usar a porta do env ou detectar automaticamente
  let portaAlvo = process.env.SERIAL_PORT;

  if (!portaAlvo) {
    // Heurística: procura Arduino (Uno, Nano, Mega, Leonardo, etc.)
    const arduino = portas.find(
      (p) =>
        /arduino/i.test(p.manufacturer || "") ||
        /ch340/i.test(p.manufacturer || "") ||  // clone chinês comum
        /ftdi/i.test(p.manufacturer || "") ||   // adaptador USB-Serial
        /acm/i.test(p.path) ||                  // Linux ACM (Uno/Mega)
        /usbmodem/i.test(p.path)                // macOS nativo
    );

    if (arduino) {
      portaAlvo = arduino.path;
      console.log(`\n🔍 Arduino detectado automaticamente: ${portaAlvo}`);
    } else if (portas.length > 0) {
      portaAlvo = portas[0].path;
      console.log(`\n⚠️  Arduino não identificado. Tentando primeira porta: ${portaAlvo}`);
    } else {
      console.log("\n⚠️  Nenhuma porta serial encontrada.");
      console.log("   Verifique se o Arduino está plugado e rode novamente.");
      console.log("   Ou defina: SERIAL_PORT=COM3 node server.js\n");
      agendarRetentativa();
      return;
    }
  }

  currentPort = portaAlvo;

  // 3. Abre a porta serial
  try {
    portInstance = new SerialPort({
      path: portaAlvo,
      baudRate: BAUD_RATE,
      autoOpen: true,
    });
  } catch (e) {
    console.error(`❌ Não foi possível abrir ${portaAlvo}:`, e.message);
    agendarRetentativa();
    return;
  }

  // 4. Usa ReadlineParser para ler linha a linha (cada JSON do Arduino termina com \n)
  const parser = portInstance.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  portInstance.on("open", () => {
    arduinoConectado = true;
    console.log(`\n✅ Arduino conectado em ${portaAlvo} @ ${BAUD_RATE} baud`);
    broadcast({ tipo: "conexao", arduino_conectado: true, porta: portaAlvo });
  });

  // 5. Recebe cada linha de dados do Arduino
  parser.on("data", (linha) => {
    const texto = linha.trim();
    if (!texto) return;

    try {
      const dados = JSON.parse(texto);

      if (dados.distancia === undefined) return;

      leiturasTotal++;
      ultimaLeitura = {
        distancia: dados.distancia,
        status: dados.status,
        risco: dados.risco,
        timestamp: new Date().toISOString(),
        leituras_total: leiturasTotal,
      };

      // Log no terminal a cada leitura
      const hora = new Date().toLocaleTimeString("pt-BR");
      console.log(
        `📡 [${hora}] Distância: ${dados.distancia} cm | Status: ${dados.status} | Risco: ${dados.risco}/5`
      );

      // Transmite para todos os navegadores
      broadcast({
        tipo: "leitura",
        ...ultimaLeitura,
      });
    } catch (e) {
      // Linha não é JSON válido (ex: mensagens de boot do Arduino) — ignora
      if (texto.length > 0) {
        console.log(`⚠️  Linha ignorada (não é JSON): ${texto}`);
      }
    }
  });

  portInstance.on("close", () => {
    arduinoConectado = false;
    currentPort = null;
    console.log("\n🔌 Arduino desconectado.");
    broadcast({ tipo: "conexao", arduino_conectado: false });
    agendarRetentativa();
  });

  portInstance.on("error", (err) => {
    arduinoConectado = false;
    console.error("❌ Erro na porta serial:", err.message);
    broadcast({ tipo: "erro", mensagem: err.message });
    agendarRetentativa();
  });
}

// Tenta reconectar a cada 5 segundos se o Arduino desconectar
function agendarRetentativa() {
  console.log("🔄 Tentando reconectar em 5 segundos...\n");
  setTimeout(() => {
    if (!arduinoConectado) initSerial();
  }, 5000);
}

// ─── START ────────────────────────────────────────────────────────────────────

httpServer.listen(HTTP_PORT, () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║         AquaSense — Servidor Node.js     ║");
  console.log(`║   Acesse: http://localhost:${HTTP_PORT}           ║`);
  console.log("╚══════════════════════════════════════════╝\n");
  initSerial();
});
