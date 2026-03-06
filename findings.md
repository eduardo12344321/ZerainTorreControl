# 🧠 Hallazgos y Decisiones: Torre de Control Zerain

Este archivo actúa como memoria a largo plazo del proyecto. Registraremos aquí descubrimientos clave, decisiones técnicas y lecciones aprendidas.

## 📝 Sesión Inicial: Generación del Plan Maestro
### Contexto del Proyecto
- **Cliente:** Transportes Zerain.
- **Misión:** "Semáforo Operativo" en TV de 50".
- **Core KPI:** Entender el estado de 7 camiones en 3 segundos.

### Decisiones Técnicas Clave
1.  **Supabase como Backend-as-a-Service:** Para velocidad de desarrollo, Auth y Realtime.
2.  **FastAPI + Cloud Run:** Para la lógica de negocio compleja (algoritmos de asignación, integraciones IA).
3.  **App Web / PWA:** Comunicación directa con conductores vía navegador móvil para máxima compatibilidad sin instalaciones.
4.  **Sistema de Colores:** Estrictamente definido (Azul, Naranja, Verde, Rojo). No usar otros colores para estados.

### Notas sobre Integraciones
- **Movertis:** Requiere polling o webhook. Clave para el "Mapa de Decisiones".
- **Asterisk/VoIP:** Se simulará inicialmente con un Webhook JSON para la fase MVP.

## 📝 Sesión: Planificación del Analizador de Facturas con IA
### Contexto del Proyecto Anexo
- **Objetivo:** Programa aislado que se unirá a la Torre de Control, destinado a analizar emails y PDFs de facturas (ej. Iberdrola).
- **Flujo:** Drag & Drop -> Extracción AI -> Validación AI vs Histórico -> Subida a Odoo.
- **Decisiones:**
  1. Frontend ligero en JS puro o React (Drag & Drop list).
  2. Backend Python actuando como orquestador de Agentes (Extracción y Validación).
  3. Uso de Google Vertex AI / Gemini API, aprovechando las claves ya existentes en este repositorio.
  4. Intervención Humana (Human-in-the-loop) requerida solo para facturas anómalas.
