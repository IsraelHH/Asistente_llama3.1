# 🌿 BioSense Dashboard - Monitor Ambiental & IA

Dashboard web minimalista monocromático en tonalidades **verde pastel** construido exclusivamente con **React** y conectado en tiempo real a **Supabase**.

Desarrollado para monitorizar los sensores ambientales del ESP32 (temperatura, humedad, presión, gas MQ-135, iluminación LDR) y los dictámenes inteligentes de **Llama 3.1** bajo estándares internacionales (**ISO 7730** e **ISO 17772-1**).

---

## 🚀 Despliegue en 3 Pasos Rápidos

### Paso 1: Configurar la Base de Datos en Supabase
1. Ingresa a tu proyecto en [Supabase](https://supabase.com/dashboard).
2. Ve a la sección **SQL Editor** en el menú lateral izquierdo.
3. Abre el archivo [`supabase_schema.sql`](./supabase_schema.sql), copia todo su contenido, pégalo en el editor y presiona **Run**.
4. ¡Listo! Esto creará la tabla `telemetria`, configurará las políticas de acceso (RLS) y activará **Realtime**.

---

### Paso 2: Subir el Dashboard a GitHub
Si vas a crear un repositorio exclusivo para el dashboard:
```bash
cd dashboard
git init
git add .
git commit -m "feat: BioSense minimalist pastel green dashboard"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

*(Si subes todo el proyecto completo, en Vercel solo seleccionas la carpeta raíz `dashboard` como "Root Directory").*

---

### Paso 3: Desplegar en Vercel (0 Configuración)
1. Ve a [Vercel](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** > **"Project"** y selecciona el repositorio que acabas de subir.
3. Si subiste el repositorio completo, en **Root Directory** haz clic en `Edit` y selecciona la carpeta `dashboard`.
4. Vercel detectará automáticamente:
   - **Framework Preset**: `Create React App`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. (Opcional) En la pestaña **Environment Variables**, puedes agregar:
   - `REACT_APP_SUPABASE_URL`: `https://hjgksxkcqzhhpcxbvdfu.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY`: `sb_publishable_-WxBFzzr2pNZnRxwN7PtrQ_6sQsv5JI`
   *(Ya vienen preconfiguradas por defecto dentro del código como respaldo).*
6. Presiona **Deploy**. En menos de 60 segundos tu dashboard estará activo con una URL pública HTTPS (`https://tu-proyecto.vercel.app`).

---

## 💻 Ejecución Local (Opcional)
Para probarlo localmente en tu computadora:
```bash
cd dashboard
npm install
npm start
```
Abrirá automáticamente [http://localhost:3000](http://localhost:3000).

---

## 🎨 Características de Diseño y Funcionalidad
- **Monocromático Verde Pastel**: Paleta suave basada en salvia y menta (`#406b4d`, `#82b08d`, `#d6e8dc`, `#f4f7f4`).
- **Exclusivamente React**: Estructura pura de Create React App sin Vite, garantizando compatibilidad nativa con Vercel.
- **Actualización en Tiempo Real**: Escucha eventos `INSERT` en Supabase vía WebSockets/Realtime + sondeo automático de respaldo cada 10s.
- **Micro-indicadores y Normas**:
  - **ISO 7730**: Confort térmico (18°C a 26°C y 30% a 60% HR).
  - **ISO 17772-1**: Calidad de aire interior (límite saludable < 1000 ppm).
  - **Meteorología**: Estimación de iluminación y riesgo de lluvia.
- **Historial de Lecturas**: Tabla de las últimas 10 mediciones con estampas de tiempo.
- **Modo Espera Elegante**: Si la base de datos aún no tiene registros del ESP32, muestra valores de referencia visuales sin romper la interfaz.
