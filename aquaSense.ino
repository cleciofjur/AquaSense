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

  digitalWrite(LED_VERMELHO, LOW);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARELO, LOW);
}

void loop() {
  digitalWrite(trigPino, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPino, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPino, LOW);

  duracao = pulseIn(echoPino, HIGH);
  distancia = duracao / 58;

  String status = "";
  int risco = 1;

  digitalWrite(LED_VERMELHO, LOW);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARELO, LOW);

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