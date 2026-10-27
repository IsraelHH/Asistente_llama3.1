from flask import Flask, request, jsonify, send_file
from langchain_community.llms import Ollama
from datetime import datetime
import whisper
import wave
import time
import os
import subprocess
import json
import urllib.request

SUPABASE_URL = "https://hjgksxkcqzhhpcxbvdfu.supabase.co"
SUPABASE_KEY = "sb_publishable_-WxBFzzr2pNZnRxwN7PtrQ_6sQsv5JI"

def guardar_telemetria_supabase(temp, hum, pres, gas, luz, cielo, lluvia, sugerencia):
    try:
        url = f"{SUPABASE_URL}/rest/v1/telemetria"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        payload = {
            "temperatura": round(float(temp), 2),
            "humedad": round(float(hum), 2),
            "presion": round(float(pres), 2),
            "gas": int(gas),
            "luz": int(luz),
            "cielo": str(cielo),
            "lluvia": str(lluvia),
            "sugerencia_ia": str(sugerencia).strip()
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"📡 Telemetría sincronizada con Supabase (Status: {resp.status})")
    except Exception as e:
        print(f"⚠️ Nota Supabase: {e}")

app = Flask(__name__)
llm = Ollama(model="llama3.1")

# Cargar el modelo Whisper para voz
print("Cargando modelo Whisper para comandos de voz...")
modelo_voz = whisper.load_model("base")
print("Modelo de voz listo.")

# Memoria global para guardar los últimos datos de los sensores
estado_habitacion = {
    "temp": 0.0, "hum": 0.0, "pres": 0.0, 
    "gas": 0, "cielo": "Desconocido", "lluvia": "Desconocida"
}

def analizar_meteorologia(luz, hum, pres):
    if luz > 1000:
        cielo = "Soleado / Muy iluminado"
    elif luz > 300:
        cielo = "Nublado / Luz artificial"
    else:
        cielo = "Oscuro / Noche"

    if hum > 70.0 and pres < 778.0 and luz < 1000:
        lluvia = "Alta (Posible precipitación o tormenta)"
    elif hum > 60.0 and pres < 782.0:
        lluvia = "Moderada (Condiciones húmedas inestables)"
    else:
        lluvia = "Baja (Estable)"
        
    return cielo, lluvia

@app.route('/api/telemetry', methods=['POST'])
def recibir_datos():
    global estado_habitacion
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se recibió JSON"}), 400
        
    temp = datos.get('temperatura', 0)
    hum = datos.get('humhumidity', 0) 
    hum = datos.get('humedad', hum)
    pres = datos.get('presion', 0)
    gas = datos.get('gas', 0)
    luz = datos.get('luz', 0)
    
    hora_actual = datetime.now().strftime("%H:%M:%S")
    estado_cielo, prob_lluvia = analizar_meteorologia(luz, hum, pres)
    
    estado_habitacion.update({
        "temp": temp, "hum": hum, "pres": pres,
        "gas": gas, "cielo": estado_cielo, "lluvia": prob_lluvia
    })
    
    print(f"\n[{hora_actual}] 🌡️ T:{temp:.1f}°C | Hum:{hum:.1f}% | Pres:{pres:.1f}hPa | Gas:{gas} | Cielo:{estado_cielo}")
    print("Consultando a Llama 3.1...\n")
    
    prompt = (
        f"Eres un asistente ambiental conversacional y experto en normativas. Evalúa los siguientes datos en tiempo real:\n\n"
        f"--- NORMAS Y ESTÁNDARES ---\n"
        f"1. ISO 7730 (Confort Térmico): Rango ideal 18.0°C a 26.0°C. Temperatura actual: {temp:.1f}°C.\n"
        f"2. ISO 7730 (Humedad Relativa): Rango ideal 30% a 60%. Humedad actual: {hum:.1f}%.\n"
        f"3. ISO 17772-1 (Calidad del Aire Interior - CO2): Límite óptimo < 1000 ppm. Nivel actual (MQ-135): {gas} ppm.\n\n"
        f"--- METEOROLOGÍA ESTIMADA ---\n"
        f"- Presión atmosférica: {pres:.1f} hPa.\n"
        f"- Iluminación: {estado_cielo} (Nivel crudo: {luz}).\n"
        f"- Probabilidad de lluvia: {prob_lluvia}.\n\n"
        f"Instrucciones:\n"
        f"Redacta un comentario muy natural, empático y breve (máximo 4 líneas). "
        f"Si todos los valores cumplen los estándares, confírmalo de forma positiva y menciona brevemente el pronóstico del clima. "
        f"Si hay alguna anomalía o alta probabilidad de lluvia, "
        f"sugiere una acción rápida."
    )
    
    dictamen = ""
    try:
        respuesta_ia = llm.invoke(prompt)
        dictamen = respuesta_ia.strip()
        print("--- Dictamen de Llama 3.1 ---")
        print(dictamen)
        print("-----------------------------")
    except Exception as e:
        print(f"Error al conectar con Ollama: {e}")
            
    # Sincronizar lectura con Supabase para el Dashboard en Vercel
    guardar_telemetria_supabase(temp, hum, pres, gas, luz, estado_cielo, prob_lluvia, dictamen)

    return jsonify({"status": "procesado_con_ia"}), 200

def generar_audio_tts(texto, archivo_salida="respuesta_ia.wav"):
    ruta_abs = os.path.abspath(archivo_salida).replace("\\", "/")
    # Limpiamos texto para no romper la invocación de PowerShell
    texto_seguro = texto.replace('"', '').replace("'", '').replace("\n", " ").strip()
    cmd = f"""
    $Voice = New-Object -ComObject SAPI.SpVoice
    $FileStream = New-Object -ComObject SAPI.SpFileStream
    $FileStream.Open('{ruta_abs}', 3)
    $Voice.AudioOutputStream = $FileStream
    $Voice.Speak('{texto_seguro}')
    $FileStream.Close()
    """
    subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True)

@app.route('/api/voz', methods=['POST'])
def recibir_voz():
    datos_crudos = request.data
    
    if not datos_crudos:
        return jsonify({"error": "No se recibió audio"}), 400

    print(f"\n🎙️ Audio recibido: {len(datos_crudos)} bytes. Transcribiendo...")
    
    nombre_archivo = "comando_recibido.wav"
    with wave.open(nombre_archivo, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(datos_crudos)

    inicio = time.time()
    resultado = modelo_voz.transcribe(nombre_archivo, language="es", fp16=False)
    fin = time.time()

    comando = resultado["text"].strip()
    
    print("--- Comando de Voz Detectado ---")
    print(f"Texto: {comando}")
    print(f"Tiempo de transcripción: {fin - inicio:.2f} segundos")
    print("--------------------------------\n")
    
    if not comando:
        return jsonify({"status": "vacio"}), 200

    prompt_voz = (
        f"Eres el asistente inteligente del cuarto. El usuario te acaba de decir por voz: '{comando}'.\n\n"
        f"Contexto actual de los sensores de la habitación:\n"
        f"- Temperatura: {estado_habitacion['temp']:.1f}°C\n"
        f"- Humedad: {estado_habitacion['hum']:.1f}%\n"
        f"- Calidad de aire (Gas): {estado_habitacion['gas']}\n"
        f"- Clima estimado: {estado_habitacion['cielo']}, Lluvia: {estado_habitacion['lluvia']}\n\n"
        f"Responde al usuario de forma natural, amigable y conversacional. Sé breve (máximo 3 líneas) "
        f"y responde directamente a lo que preguntó basándote en los datos si es relevante."
    )
    
    print("🧠 Pensando respuesta con Llama 3.1...")
    try:
        respuesta_ia = llm.invoke(prompt_voz)
        texto_limpio = respuesta_ia.strip()
        
        print("\n=== RESPUESTA DEL ASISTENTE ===")
        print(texto_limpio)
        print("===============================\n")
        
        print("🔊 Sintetizando audio de voz para el ESP32...")
        nombre_wav_salida = "respuesta_ia.wav"
        generar_audio_tts(texto_limpio, nombre_wav_salida)
        
        if os.path.exists(nombre_wav_salida):
            print("🚀 Transmitiendo audio a la bocina del sistema embebido...")
            return send_file(nombre_wav_salida, mimetype="audio/wav")
        else:
            return jsonify({"status": "error_tts"}), 500
        
    except Exception as e:
        print(f"Error al procesar con Ollama / TTS: {e}")
        return jsonify({"status": "error", "detalle": str(e)}), 500

if __name__ == '__main__':
    print("Iniciando Asistente Inteligente (Telemetría + Voz)...")
    app.run(host='0.0.0.0', port=5001)
