# 💧 AquaSense — Monitoramento Hídrico Inteligente

Plataforma de monitoramento hídrico em tempo real para prevenção de enchentes, desenvolvida com Arduino, Node.js e WebSocket. Alinhada ao **ODS 11 — Cidades e Comunidades Sustentáveis**.

---

## 🗂️ Estrutura do Projeto

```
AquaSense/
└── aquasense-server/
    ├── server.js               ← Servidor Node.js (Serial + WebSocket + Express)
    ├── package.json
    ├── .env.example            ← Modelo de configuração da porta serial
    └── public/                 ← Site servido pelo Express
        ├── index.html
        └── src/
            ├── style.css
            └── script-ws.js   ← Comunicação WebSocket com o servidor
```

---

## ⚙️ Como o sistema funciona

```
Arduino (USB) → Node.js (SerialPort) → WebSocket → Navegador (Painel)
```

1. O Arduino lê o sensor ultrassônico e envia JSON via porta serial
2. O servidor Node.js recebe esses dados e os transmite via WebSocket
3. O navegador recebe os dados e atualiza o painel em tempo real
4. Qualquer navegador funciona (Chrome, Firefox, Edge, Safari)

---

## 🖥️ Pré-requisitos

Antes de começar, instale os seguintes programas na máquina:

| Programa | Link | Observação |
|----------|------|------------|
| **Node.js** (v18 ou superior) | [nodejs.org](https://nodejs.org) | Baixe a versão LTS |
| **Git** | [git-scm.com](https://git-scm.com) | Instale com opções padrão |
| **Arduino IDE** | [arduino.cc](https://www.arduino.cc/en/software) | Para gravar o código no Arduino |
| **Google Chrome** ou **Edge** | — | Para acessar o painel |

---

## 🚀 Instalação passo a passo

### Passo 1 — Clonar o repositório

Abra o terminal (CMD, PowerShell ou Terminal do VS Code) e execute:

```bash
git clone https://github.com/cleciofjur/AquaSense.git
```

Navegue até a pasta do servidor:

```bash
cd AquaSense/aquasense-server
```

---

### Passo 2 — Instalar as dependências Node.js

Ainda dentro da pasta `aquasense-server`, execute:

```bash
npm install
```

Aguarde o download das dependências. Ao final, uma pasta `node_modules/` será criada automaticamente.

> ⚠️ Se aparecer warnings de `LF will be replaced by CRLF` no Windows, pode ignorar — é normal e não afeta o funcionamento.

---

### Passo 3 — Gravar o código no Arduino

1. Abra o **Arduino IDE**
2. Conecte o Arduino ao computador via cabo USB
3. Abra o arquivo `aquasense-server/arduino/aquasense.ino`  
   *(ou copie e cole o código abaixo diretamente no Arduino IDE)*

```cpp
int echoPino = 12;
int trigPino = 13;
int LED_VERMELHO = 5;
int LED_VERDE    = 6;
int LED_AMARELO  = 7;

long duracao   = 0;
long distancia = 0;

void setup() {
  Serial.begin(9600);
  pinMode(echoPino, INPUT);
  pinMode(trigPino, OUTPUT);
  pinMode(LED_VERMELHO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARELO, OUTPUT);
}

void loop() {
  digitalWrite(trigPino, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPino, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPino, LOW);

  duracao = pulseIn(echoPino, HIGH);
  distancia = duracao / 58;

  digitalWrite(LED_VERMELHO, LOW);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARELO, LOW);

  String status = "";
  int risco = 1;

  if (distancia <= 8) {
    digitalWrite(LED_VERMELHO, HIGH);
    status = "Perigo";
    risco = 5;
  } else if (distancia <= 11.5) {
    digitalWrite(LED_AMARELO, HIGH);
    status = "Atencao";
    risco = 3;
  } else {
    digitalWrite(LED_VERDE, HIGH);
    status = "Seguro";
    risco = 1;
  }

  Serial.print("{\"distancia\":");
  Serial.print(distancia);
  Serial.print(",\"status\":\"");
  Serial.print(status);
  Serial.print("\",\"risco\":");
  Serial.print(risco);
  Serial.println("}");

  delay(1000);
}
```

4. Em **Ferramentas → Placa**, selecione o modelo do seu Arduino (ex: `Arduino Uno`)
5. Em **Ferramentas → Porta**, selecione a porta COM do Arduino  
   *(ex: `COM3` no Windows, `/dev/ttyUSB0` no Linux, `/dev/cu.usbmodem...` no macOS)*
6. Clique em **Upload** (→) para gravar o código
7. Após o upload, **feche o Monitor Serial do Arduino IDE** — o Node.js precisa da porta livre

---

### Passo 4 — Descobrir a porta serial do Arduino

Com o Arduino conectado via USB, execute no terminal dentro de `aquasense-server/`:

```bash
node -e "const {SerialPort} = require('serialport'); SerialPort.list().then(p => console.table(p))"
```

Anote o valor da coluna **path** que corresponder ao Arduino. Exemplos:

| Sistema | Porta típica |
|---------|-------------|
| Windows | `COM3`, `COM4`, `COM5`... |
| Linux | `/dev/ttyUSB0`, `/dev/ttyACM0` |
| macOS | `/dev/cu.usbmodem1401`, `/dev/cu.usbserial-...` |

> 💡 No Windows, você também pode verificar em **Gerenciador de Dispositivos → Portas (COM e LPT)**

---

### Passo 5 — Configurar a porta serial (se necessário)

O servidor tenta **detectar o Arduino automaticamente**. Se a detecção não funcionar, configure manualmente:

1. Na pasta `aquasense-server/`, copie o arquivo de exemplo:

```bash
# Windows (PowerShell)
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

2. Abra o arquivo `.env` e edite com a sua porta:

```env
SERIAL_PORT=COM3
```

> Substitua `COM3` pela porta encontrada no Passo 4.

---

### Passo 6 — Iniciar o servidor

Dentro da pasta `aquasense-server/`, execute:

```bash
npm start
```

O terminal deve mostrar algo assim:

```
╔══════════════════════════════════════════╗
║         AquaSense — Servidor Node.js     ║
║   Acesse: http://localhost:3000           ║
╚══════════════════════════════════════════╝

📋 Portas seriais disponíveis:
   • COM3 — Arduino Uno

✅ Arduino conectado em COM3 @ 9600 baud
📡 [14:32:01] Distância: 22.3 cm | Status: Seguro | Risco: 1/5
📡 [14:32:02] Distância: 22.1 cm | Status: Seguro | Risco: 1/5
```

---

### Passo 7 — Acessar o painel

Abra o navegador e acesse:

```
http://localhost:3000
```

O painel será carregado e começará a receber dados do Arduino automaticamente.

> ⚠️ **Atenção:** Sempre acesse pelo endereço `http://localhost:3000` — nunca abra o arquivo `index.html` diretamente pelo explorador de arquivos, pois o WebSocket não funcionará.

---

## ❌ Solução de Problemas

### O servidor não encontra o Arduino automaticamente

Defina a porta manualmente no arquivo `.env` conforme o Passo 5.

---

### Erro `EACCES` no Linux/macOS (permissão negada na porta serial)

Execute o comando abaixo e **reinicie o computador**:

```bash
sudo usermod -a -G dialout $USER
```

---

### Porta já está em uso (`Error: Opening COM3: Access denied`)

O **Monitor Serial do Arduino IDE** está aberto e travando a porta. Feche o Arduino IDE completamente e reinicie o servidor.

---

### O painel abre mas fica em "Aguardando..."

Verifique se está acessando via `http://localhost:3000` e **não** pelo arquivo direto. Verifique também se o servidor está rodando no terminal.

---

### Erro `Cannot find module 'serialport'`

As dependências não foram instaladas corretamente. Execute novamente dentro da pasta `aquasense-server/`:

```bash
npm install
```

---

### O Arduino aparece na lista de portas mas os dados não chegam

Verifique se o código foi gravado corretamente no Arduino e se o `baudRate` no Arduino é `9600` — o mesmo configurado no `server.js`.

---

## 🔄 Atualizando o projeto

Quando houver atualizações no repositório, dentro da pasta `AquaSense/` execute:

```bash
git pull
cd aquasense-server
npm install
npm start
```

---

## 🛠️ Comandos úteis

| Comando | O que faz |
|---------|-----------|
| `npm start` | Inicia o servidor normalmente |
| `npm run dev` | Inicia com reinício automático ao salvar arquivos (requer nodemon) |
| `Ctrl + C` | Para o servidor |
| `http://localhost:3000/status` | Exibe status JSON do servidor no navegador |
| `http://localhost:3000/portas` | Lista as portas seriais disponíveis no navegador |

---

## 🧰 Tecnologias utilizadas

- **Arduino** — Leitura do sensor ultrassônico HC-SR04
- **Node.js** — Servidor backend
- **SerialPort** — Comunicação com o Arduino via USB
- **Express** — Servidor HTTP para o front-end
- **WebSocket (ws)** — Transmissão de dados em tempo real ao navegador
- **HTML / CSS / JavaScript** — Interface do painel

---

## 📄 Licença

Projeto Acadêmico · ODS 11 — Cidades e Comunidades Sustentáveis · 2026  
Código aberto para fins educacionais e de pesquisa.
