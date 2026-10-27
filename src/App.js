import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

// Minimalist Pastel SVG Icons
const IconThermometer = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const IconDroplet = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const IconGauge = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 12l3-3" />
    <path d="M7 16a5 5 0 0 1 0-7" />
  </svg>
);

const IconWind = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  </svg>
);

const IconSun = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IconCloudRain = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16" y1="13" x2="16" y2="21" />
    <line x1="8" y1="13" x2="8" y2="21" />
    <line x1="12" y1="15" x2="12" y2="23" />
    <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
  </svg>
);

const IconSparkles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const IconRefresh = ({ spin }) => (
  <svg className={spin ? "spin" : ""} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

// Fallback demo reading when database is fresh / empty
const DATOS_DEFAULT = {
  temperatura: 22.4,
  humedad: 48.0,
  presion: 1013.2,
  gas: 412,
  luz: 680,
  cielo: "Despejado / Iluminación Natural",
  lluvia: "Baja (0%)",
  sugerencia_ia: "Condiciones de confort térmico óptimas bajo norma ISO 7730. La calidad de aire es excelente (MQ-135 < 1000 ppm) y la ventilación es adecuada. No se requiere intervención.",
  created_at: new Date().toISOString()
};

function App() {
  const [datosActuales, setDatosActuales] = useState(DATOS_DEFAULT);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [esDemo, setEsDemo] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  // Consulta de datos en Supabase
  const obtenerDatos = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('telemetria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn("No se pudo obtener datos de Supabase (usando demo temporal):", error.message);
        setEsDemo(true);
      } else if (data && data.length > 0) {
        setDatosActuales(data[0]);
        setHistorial(data);
        setEsDemo(false);
        setUltimaActualizacion(new Date(data[0].created_at || Date.now()));
      } else {
        // Tabla vacía
        setEsDemo(true);
      }
    } catch (err) {
      console.error("Error al conectar con Supabase:", err);
      setEsDemo(true);
    } finally {
      setCargando(false);
    }
  }, []);

  // Suscripción Realtime y polling de respaldo
  useEffect(() => {
    obtenerDatos();

    // Suscripción Supabase Realtime
    const canal = supabase
      .channel('cambios-telemetria')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telemetria' },
        (payload) => {
          if (payload.new) {
            setDatosActuales(payload.new);
            setHistorial((prev) => [payload.new, ...prev.slice(0, 9)]);
            setUltimaActualizacion(new Date());
            setEsDemo(false);
          }
        }
      )
      .subscribe();

    // Refresco periódico cada 10 segundos
    const intervalo = setInterval(() => {
      obtenerDatos();
    }, 10000);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalo);
    };
  }, [obtenerDatos]);

  // Evaluaciones de estado basadas en normativas
  const getEstadoTemp = (t) => {
    if (t >= 18 && t <= 26) return { texto: 'Confort Ideal (ISO 7730)', clase: 'tag-ideal' };
    if (t < 18) return { texto: 'Fresco / Frío', clase: 'tag-alerta' };
    return { texto: 'Cálido', clase: 'tag-alerta' };
  };

  const getEstadoHumedad = (h) => {
    if (h >= 30 && h <= 60) return { texto: 'Óptima (30% - 60%)', clase: 'tag-ideal' };
    if (h < 30) return { texto: 'Ambiente Seco', clase: 'tag-alerta' };
    return { texto: 'Ambiente Húmedo', clase: 'tag-alerta' };
  };

  const getEstadoGas = (g) => {
    if (g < 600) return { texto: 'Excelente (< 600 ppm)', clase: 'tag-ideal' };
    if (g < 1000) return { texto: 'Aceptable (ISO 17772)', clase: 'tag-moderado' };
    return { texto: 'Ventilación Requerida', clase: 'tag-alerta' };
  };

  const estadoTemp = getEstadoTemp(datosActuales.temperatura);
  const estadoHum = getEstadoHumedad(datosActuales.humedad);
  const estadoGas = getEstadoGas(datosActuales.gas);

  return (
    <div className="dashboard-container">
      {/* Barra Superior Minimalista */}
      <header className="header">
        <div className="brand">
          <div className="brand-dot"></div>
          <div>
            <h1 className="brand-title">Asistente</h1>

          </div>
        </div>

        <div className="header-status">
          <div className="status-indicator">
            <span className={`pulse-dot ${esDemo ? 'pulse-demo' : 'pulse-live'}`}></span>
            <span className="status-label">
              {esDemo ? 'En espera' : 'Sincronizado'}
            </span>
          </div>

          <button 
            className="btn-refresh" 
            onClick={obtenerDatos} 
            disabled={cargando}
            title="Recargar datos"
          >
            <IconRefresh spin={cargando} />
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      {/* Tarjeta Principal: Dictamen de la Inteligencia Artificial */}
      <section className="ai-card">
        <div className="ai-card-header">
          <div className="ai-badge">
            <IconSparkles />
            <span>Dictamen de Llama 3.1</span>
          </div>
          <span className="timestamp">
            {new Date(datosActuales.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <p className="ai-text">
          "{datosActuales.sugerencia_ia || "Recopilando datos de telemetría para generar el primer diagnóstico ambiental..."}"
        </p>

        <div className="ai-chips">
          <span className="chip chip-iso">ISO 7730: {estadoTemp.texto}</span>
          <span className="chip chip-iso">ISO 17772-1: {estadoGas.texto}</span>
          <span className="chip chip-weather">{datosActuales.cielo || 'Clima Estable'}</span>
        </div>
      </section>

      {/* Cuadrícula de Sensores */}
      <section className="grid-sensors">
        {/* 1. Temperatura */}
        <div className="sensor-card">
          <div className="sensor-card-top">
            <span className="sensor-icon">
              <IconThermometer />
            </span>
            <span className={`badge ${estadoTemp.clase}`}>{estadoTemp.texto}</span>
          </div>
          <div className="sensor-body">
            <span className="sensor-value">
              {Number(datosActuales.temperatura || 0).toFixed(1)}
              <span className="sensor-unit">°C</span>
            </span>
            <span className="sensor-title">Temperatura (BMP280)</span>
          </div>
          <div className="sensor-progress-bg">
            <div 
              className="sensor-progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, ((datosActuales.temperatura - 10) / 30) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* 2. Humedad */}
        <div className="sensor-card">
          <div className="sensor-card-top">
            <span className="sensor-icon">
              <IconDroplet />
            </span>
            <span className={`badge ${estadoHum.clase}`}>{estadoHum.texto}</span>
          </div>
          <div className="sensor-body">
            <span className="sensor-value">
              {Number(datosActuales.humedad || 0).toFixed(1)}
              <span className="sensor-unit">%</span>
            </span>
            <span className="sensor-title">Humedad Relativa (DHT11)</span>
          </div>
          <div className="sensor-progress-bg">
            <div 
              className="sensor-progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, datosActuales.humedad))}%` }}
            ></div>
          </div>
        </div>

        {/* 3. Presión Barométrica */}
        <div className="sensor-card">
          <div className="sensor-card-top">
            <span className="sensor-icon">
              <IconGauge />
            </span>
            <span className="badge tag-ideal">Normal</span>
          </div>
          <div className="sensor-body">
            <span className="sensor-value">
              {Number(datosActuales.presion || 0).toFixed(1)}
              <span className="sensor-unit">hPa</span>
            </span>
            <span className="sensor-title">Presión Barométrica (BMP280)</span>
          </div>
          <div className="sensor-progress-bg">
            <div 
              className="sensor-progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, ((datosActuales.presion - 950) / 100) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* 4. Calidad del Aire / Gas */}
        <div className="sensor-card">
          <div className="sensor-card-top">
            <span className="sensor-icon">
              <IconWind />
            </span>
            <span className={`badge ${estadoGas.clase}`}>{estadoGas.texto}</span>
          </div>
          <div className="sensor-body">
            <span className="sensor-value">
              {datosActuales.gas || 0}
              <span className="sensor-unit">ppm</span>
            </span>
            <span className="sensor-title">Calidad del Aire (MQ-135)</span>
          </div>
          <div className="sensor-progress-bg">
            <div 
              className="sensor-progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, (datosActuales.gas / 1200) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* 5. Nivel de Iluminación */}
        <div className="sensor-card">
          <div className="sensor-card-top">
            <span className="sensor-icon">
              <IconSun />
            </span>
            <span className="badge tag-neutral">{datosActuales.cielo || 'Luz'}</span>
          </div>
          <div className="sensor-body">
            <span className="sensor-value">
              {datosActuales.luz || 0}
              <span className="sensor-unit">raw</span>
            </span>
            <span className="sensor-title">Iluminación Ambiental (LDR)</span>
          </div>
          <div className="sensor-progress-bg">
            <div 
              className="sensor-progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, (datosActuales.luz / 4095) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* 6. Probabilidad de Lluvia */}
        <div className="sensor-card">
          <div className="sensor-card-top">
            <span className="sensor-icon">
              <IconCloudRain />
            </span>
            <span className="badge tag-neutral">Meteorología</span>
          </div>
          <div className="sensor-body">
            <span className="sensor-value" style={{ fontSize: '1.45rem' }}>
              {datosActuales.lluvia || 'Baja'}
            </span>
            <span className="sensor-title">Probabilidad de Precipitación</span>
          </div>
          <div className="sensor-progress-bg">
            <div 
              className="sensor-progress-fill" 
              style={{ width: datosActuales.lluvia?.toLowerCase().includes('alta') ? '85%' : datosActuales.lluvia?.toLowerCase().includes('moderada') ? '50%' : '20%' }}
            ></div>
          </div>
        </div>
      </section>

      {/* Historial Reciente */}
      {historial.length > 0 && (
        <section className="history-section">
          <h2 className="history-title">Registro de Lecturas Recientes</h2>
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Temperatura</th>
                  <th>Humedad</th>
                  <th>Presión</th>
                  <th>Gas (MQ-135)</th>
                  <th>Iluminación</th>
                  <th>Cielo / Clima</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>{new Date(item.created_at).toLocaleTimeString('es-MX')}</td>
                    <td>{Number(item.temperatura).toFixed(1)} °C</td>
                    <td>{Number(item.humedad).toFixed(1)} %</td>
                    <td>{Number(item.presion).toFixed(1)} hPa</td>
                    <td>{item.gas} ppm</td>
                    <td>{item.luz}</td>
                    <td><span className="chip-cell">{item.cielo || 'Normal'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Footer Minimalista */}
      <footer className="footer">
        <p>Asistente IoT • ESP32 + Llama 3.1 + Supabase • Desplegado en Vercel</p>
      </footer>
    </div>
  );
}

export default App;
