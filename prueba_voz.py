import whisper
import time

print("Cargando el modelo Whisper (tamaño 'base') en CPU...")
# Forzamos el uso del CPU (el M4 lo procesará sin problemas)
modelo = whisper.load_model("base", device="cpu") 

print("Escuchando y transcribiendo archivo...")
inicio = time.time()

# fp16=False evita advertencias de compatibilidad en CPU
resultado = modelo.transcribe("prueba_fuerte.wav", language="es", fp16=False)



fin = time.time()

print("\n--- Resultado de la Transcripción ---")
print(f"Texto: {resultado['text'].strip()}")
print(f"Tiempo de procesamiento: {fin - inicio:.2f} segundos")
print("-------------------------------------")
