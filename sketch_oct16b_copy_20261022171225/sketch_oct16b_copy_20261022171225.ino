#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <DHT.h> 
#include <driver/i2s.h>

// --- Credenciales y Servidor ---
const char* ssid = "IZZI-95F4";
const char* password = "7J26T27NmME9xThAC2";
const char* serverName = "http://192.168.0.115:5001/api/telemetry"; 
const char* serverVoz  = "http://192.168.0.115:5001/api/voz";

// --- Pines Sensores Ambientales ---
#define PIN_MQ135 4  
#define PIN_LDR   5  
#define DHTPIN    6  
#define DHTTYPE   DHT11

// --- Pines Micrófono INMP441 (Entrada) ---
#define MIC_WS    10
#define MIC_SCK   11
#define MIC_SD    12
#define I2S_MIC_PORT I2S_NUM_0

// --- Pines Amplificador MAX98357A (Salida Bocina) ---
#define SPK_LRC   16
#define SPK_BCLK  17
#define SPK_DIN   18
#define I2S_SPK_PORT I2S_NUM_1

// Botón Push-To-Talk (PTT)
#define PTT_PIN   15

Adafruit_BMP280 bmp; 
DHT dht(DHTPIN, DHTTYPE);

unsigned long ultimoEnvio = 0;
const unsigned long intervaloEnvio = 60000;
bool grabando = false;
uint8_t* bufferAudio = nullptr;
size_t tamanioAudio = 0;
const size_t MAX_AUDIO_SIZE = 150000; 

// Configurar Micrófono INMP441
void setup_mic() {
  i2s_config_t i2s_mic_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  i2s_pin_config_t pin_mic_config = {
    .bck_io_num = MIC_SCK,
    .ws_io_num = MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = MIC_SD
  };
  i2s_driver_install(I2S_MIC_PORT, &i2s_mic_config, 0, NULL);
  i2s_set_pin(I2S_MIC_PORT, &pin_mic_config);
}

// Configurar Amplificador MAX98357A
void setup_speaker() {
  i2s_config_t i2s_spk_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = 22050, // Se ajustará automáticamente según el WAV
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT, // Mono para MAX98357A
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 1024,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };
  i2s_pin_config_t pin_spk_config = {
    .bck_io_num = SPK_BCLK,
    .ws_io_num = SPK_LRC,
    .data_out_num = SPK_DIN,
    .data_in_num = I2S_PIN_NO_CHANGE
  };
  i2s_driver_install(I2S_SPK_PORT, &i2s_spk_config, 0, NULL);
  i2s_set_pin(I2S_SPK_PORT, &pin_spk_config);
}

// Leer cabecera WAV (primeros 44 bytes) y extraer sample rate
uint32_t leer_sample_rate_wav(WiFiClient* stream) {
  uint8_t hdr[44];
  size_t leidos = 0;
  unsigned long timeout = millis();
  while (leidos < 44 && (millis() - timeout) < 3000) {
    if (stream->available()) {
      size_t r = stream->readBytes((char*)(hdr + leidos), 44 - leidos);
      leidos += r;
    }
    delay(5);
  }
  if (leidos < 44) return 22050; // Fallback estándar de SAPI
  uint32_t sr = (uint32_t)hdr[24] |
                ((uint32_t)hdr[25] << 8) |
                ((uint32_t)hdr[26] << 16) |
                ((uint32_t)hdr[27] << 24);
  Serial.printf("🔊 Sample rate detectado: %u Hz\n", sr);
  return sr;
}

// Reproducción precisa del WAV sin demoras al terminar
void reproducir_respuesta_ia(HTTPClient &http) {
  int totalBytes = http.getSize();
  WiFiClient* stream = http.getStreamPtr();
  
  if (totalBytes > 0 && totalBytes <= 44) {
    Serial.println("⚠️ Respuesta muy corta o no es audio.");
    return;
  }
  
  Serial.println("🔊 Recibiendo audio de la IA. Reproduciendo...");
  
  // 1. Leer encabezado y calibrar sample rate
  uint32_t sr = leer_sample_rate_wav(stream);
  if (sr >= 8000 && sr <= 48000) {
    i2s_set_sample_rates(I2S_SPK_PORT, sr);
  }
  
  uint8_t bufferSpk[1024];
  size_t bytesEscritos = 0;
  
  if (totalBytes > 44) {
    // Terminación exacta por conteo de bytes (elimina los 30 segundos de espera)
    int bytesRestantes = totalBytes - 44;
    unsigned long ultimoDato = millis();
    
    while (bytesRestantes > 0) {
      if (stream->available()) {
        size_t aLeer = min((size_t)sizeof(bufferSpk), (size_t)bytesRestantes);
        size_t leidos = stream->readBytes((char*)bufferSpk, aLeer);
        if (leidos > 0) {
          i2s_write(I2S_SPK_PORT, bufferSpk, leidos, &bytesEscritos, portMAX_DELAY);
          bytesRestantes -= leidos;
          ultimoDato = millis();
        }
      } else {
        if (!http.connected() || (millis() - ultimoDato > 2000)) {
          break; 
        }
        delay(2);
      }
    }
  } else {
    // Modo alternativo si el servidor no envió Content-Length
    unsigned long ultimoDato = millis();
    while (http.connected() || stream->available()) {
      if (stream->available()) {
        size_t leidos = stream->readBytes((char*)bufferSpk, sizeof(bufferSpk));
        if (leidos > 0) {
          i2s_write(I2S_SPK_PORT, bufferSpk, leidos, &bytesEscritos, portMAX_DELAY);
          ultimoDato = millis();
        }
      } else {
        if (millis() - ultimoDato > 1000) {
          break;
        }
        delay(5);
      }
    }
  }
  
  i2s_zero_dma_buffer(I2S_SPK_PORT);
  Serial.println("✅ Audio finalizado en la bocina!");
}

void setup() {
  Serial.begin(115200);
  delay(3000); 
  
  pinMode(PTT_PIN, INPUT_PULLUP);

  WiFi.begin(ssid, password);
  Serial.print("\nConectando a WiFi");
  while(WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Conectado!");

  Wire.begin(8, 9);
  bmp.begin(0x76);
  dht.begin();

  setup_mic();
  setup_speaker();
  Serial.println("Micrófono I2S y Bocina MAX98357A listos.");
}

void loop() {
  bool botonPresionado = (digitalRead(PTT_PIN) == LOW);

  // A. Iniciar grabación al presionar PTT
  if (botonPresionado && !grabando) {
    grabando = true;
    tamanioAudio = 0;
    bufferAudio = (uint8_t*)malloc(MAX_AUDIO_SIZE); 
    if (bufferAudio != nullptr) Serial.println("🔴 Grabando...");
  }

  // B. Acumular audio del micrófono
  if (botonPresionado && grabando) {
    size_t bytes_leidos;
    uint8_t bufferTemp[1024];
    esp_err_t resultado = i2s_read(I2S_MIC_PORT, &bufferTemp, sizeof(bufferTemp), &bytes_leidos, 10 / portTICK_PERIOD_MS);
    if (resultado == ESP_OK && bytes_leidos > 0 && (tamanioAudio + bytes_leidos < MAX_AUDIO_SIZE)) {
      memcpy(bufferAudio + tamanioAudio, bufferTemp, bytes_leidos);
      tamanioAudio += bytes_leidos;
    }
  }

  // C. Al soltar el botón, enviar la voz a la IA y reproducir la respuesta
  if (!botonPresionado && grabando) {
    grabando = false;
    Serial.println("⏹️ Enviando audio al servidor...");
    
    if(WiFi.status() == WL_CONNECTED && tamanioAudio > 0) {
      HTTPClient http;
      http.begin(serverVoz);
      http.setTimeout(45000); 
      http.addHeader("Content-Type", "application/octet-stream"); 
      
      int httpResponseCode = http.POST(bufferAudio, tamanioAudio);
      
      if (httpResponseCode == 200) {
        reproducir_respuesta_ia(http);
      } else {
        Serial.printf("❌ Error HTTP: %d\n", httpResponseCode);
      }
      http.end();
    }
    
    if (bufferAudio != nullptr) {
      free(bufferAudio);
      bufferAudio = nullptr;
    }
    tamanioAudio = 0;
  }

  // D. Telemetría periódica en segundo plano
  unsigned long tiempoActual = millis();
  if (tiempoActual - ultimoEnvio >= intervaloEnvio) {
    ultimoEnvio = tiempoActual;
    if(WiFi.status() == WL_CONNECTED && !grabando) {
      HTTPClient http;
      http.begin(serverName);
      http.addHeader("Content-Type", "application/json");
      float hum = dht.readHumidity(); if (isnan(hum)) hum = 0.0;
      
      String jsonPayload = "{";
      jsonPayload += "\"temperatura\":" + String(bmp.readTemperature(), 2) + ",";
      jsonPayload += "\"humedad\":" + String(hum, 2) + ",";
      jsonPayload += "\"presion\":" + String(bmp.readPressure() / 100.0F, 2) + ",";
      jsonPayload += "\"gas\":" + String(analogRead(PIN_MQ135)) + ",";
      jsonPayload += "\"luz\":" + String(analogRead(PIN_LDR));
      jsonPayload += "}";

      http.POST(jsonPayload);
      http.end();
    }
  }

  delay(10);
}
