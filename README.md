# MEDIINFO

Plataforma educativa de salud para Ecuador con catálogo centralizado, mapa interactivo de las 24 provincias, administración protegida y orientación mediante ALBA, un asistente conectado a Google Gemini.

## Tecnologías

- Frontend: HTML, CSS, JavaScript y Leaflet.
- Backend: Node.js, Express y TypeScript.
- Base de datos y autenticación: Supabase/PostgreSQL.
- Inteligencia artificial: Google Gemini.
- Datos geográficos: geoBoundaries, licencia CC0.

## Configuración

1. Instala las dependencias del backend:

   ```powershell
   cd backend
   npm install
   ```

2. Configura `backend/.env` usando `.env.example` como referencia:

   ```env
   GEMINI_API_KEY=tu_clave
   GEMINI_MODEL=gemini-3.5-flash-lite
   PORT=3000
   ALLOWED_ORIGIN=http://localhost:3000
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_PUBLISHABLE_KEY=tu_clave_publicable
   DATABASE_URL=postgresql://postgres:tu_clave@db.tu-proyecto.supabase.co:5432/postgres
   ADMIN_EMAIL=administrador@ejemplo.com
   ```

3. Crea o actualiza el esquema de Supabase:

   ```powershell
   npm run db:migrate
   ```

4. Inicia el proyecto:

   ```powershell
   npm run dev
   ```

5. Abre `http://localhost:3000`.

## Funciones

- Catálogo consultado directamente desde Supabase.
- Búsqueda por enfermedad, categoría o síntoma.
- Fichas con síntomas, prevención, alertas, fuentes y provincias.
- ALBA responde con orientación, acciones, alertas y preguntas rápidas.
- ALBA propone enfermedades relevantes que todavía no están registradas y permite investigar la opción elegida.
- ALBA detecta enfermedades consultadas que aún no existen, completa su ficha y las registra como pendientes de revisión.
- Mapa interactivo con filtros y referencias para las 24 provincias.
- Administración protegida con Supabase Auth.
- Creación, edición y eliminación real de enfermedades.
- Interfaz adaptable, navegación por teclado y reducción de movimiento.

## Acceso administrativo

El correo permitido se define en `ADMIN_EMAIL`. En la primera visita a `admin.html`, usa **Crear acceso por primera vez** y confirma el mensaje enviado por Supabase. Después podrás iniciar sesión desde el mismo panel.

## Seguridad y alcance

- Las claves de Gemini, PostgreSQL y demás secretos permanecen en el backend.
- `backend/.env` está excluido de GitHub.
- Las consultas y datos se validan antes de llegar a Gemini o PostgreSQL.
- Las rutas administrativas verifican el token y el correo autorizado.
- Las enfermedades generadas por ALBA se identifican como pendientes de revisión.
- El mapa presenta zonas educativas, no casos ni brotes actuales.
- ALBA no diagnostica ni prescribe medicamentos.
- Ante una emergencia se debe llamar al ECU 911.

## Comandos de verificación

```powershell
npm run typecheck
npm run build
```

## Despliegue en Vercel

El proyecto se publica como un solo sitio: el frontend (`frontend/`) se sirve como estático y la API de Express se ejecuta como función serverless (`api/index.js`, que usa `backend/dist/app.js`).

1. Importa el repositorio en Vercel y deja el **Root Directory en la raíz** del proyecto (no en `backend/`). El `vercel.json` ya define `buildCommand`, `outputDirectory` y el rewrite de `/api/*`.
2. En **Settings → Environment Variables** agrega:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `DATABASE_URL` (**usa la cadena del pooler de Supabase**, puerto `6543`, porque el puerto directo agota conexiones en serverless)
   - `ADMIN_EMAIL`
   - `ALLOWED_ORIGIN` (tu dominio de Vercel, por ejemplo `https://tu-proyecto.vercel.app`)
3. Deploy: las rutas `/api/*` las atiende la función serverless y el resto son archivos estáticos.

> En Vercel **no** se usa `backend/.env`; las variables se configuran en el panel. Para desarrollo local, copia `backend/.env.example` a `backend/.env`.
