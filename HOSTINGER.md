# Guía de Despliegue en Hostinger - Omia

Esta guía te guiará paso a paso para desplegar **Omia** en tu hosting de Hostinger, optimizado para rendimiento, SEO y compatibilidad con rutas de React.

---

## Opción 1: Despliegue como SPA Estática (Recomendado para Planes Básicos)
Si utilizas un plan de hosting compartido estándar de Hostinger (Single, Premium, Business), la forma más rápida y eficiente de desplegar es como una Single Page Application (SPA).

### Paso 1: Compilar la Aplicación
En tu entorno de desarrollo o terminal de despliegue, ejecuta el comando de producción:
```bash
npm run build
```
Esto generará una carpeta llamada `dist/` en la raíz de tu proyecto. Esta carpeta contiene el código optimizado de React, CSS minificado y las imágenes preparadas.

### Paso 2: Subir los Archivos a Hostinger
1. Iniciá sesión en tu panel de control de **Hostinger (hPanel)**.
2. Dirigite a **Sitios Web** > **Administrador de Archivos** (File Manager) de tu dominio.
3. Entrá a la carpeta pública principal, que usualmente es `public_html/`.
4. Subí **todo el contenido interno** de la carpeta local `dist/` directamente a `public_html/`. No subas la carpeta `dist` en sí, sino lo que tiene adentro (`assets/`, `index.html`, `.htaccess`, etc.).

### Paso 3: Soporte de Rutas (.htaccess ya incluido)
Hemos creado un archivo `.htaccess` en tu carpeta `public/` que se compila automáticamente en `dist/`. Este archivo es indispensable para evitar errores **404 Not Found** cuando un usuario refresca la página o ingresa directamente a rutas como `/directorio` o `/estudios`.

El contenido del archivo `.htaccess` ya se encuentra configurado para vos:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Opción 2: Despliegue como Aplicación Node.js Full-Stack (Planes VPS o Node.js de Hostinger)
Si querés aprovechar al máximo el backend de Express (`server.ts`) para procesamiento de pagos integrados con Mercado Pago, búsquedas avanzadas con IA y registro dinámico de visitas de profesores:

### Paso 1: Configurar la Aplicación de Node.js en Hostinger
1. En tu **hPanel** de Hostinger, ve a la sección **Node.js** (disponible en VPS o planes optimizados de Node).
2. Crea una nueva aplicación Node.js e ingresa la siguiente información:
   - **Directorio de la app**: `/home/usuario/public_html` (o el directorio que asignes).
   - **Versión de Node.js**: Seleccioná la versión recomendada (v18 o superior).
   - **Archivo de inicio / Script de entrada**: `dist/server.cjs` (generado por el build).

### Paso 2: Configurar las Variables de Entorno en Hostinger
En el apartado de configuración de tu aplicación Node en el hPanel, debés agregar las siguientes variables de entorno:
- `NODE_ENV`: `production`
- `PORT`: `3000` (o el puerto que Hostinger asigne por defecto)
- `GEMINI_API_KEY`: Tu clave de Google AI Studio para que funcione el motor de búsqueda con inteligencia artificial.
- `MERCADOPAGO_ACCESS_TOKEN`: Tu token de Mercado Pago para procesar los cobros de membresías de los profesores.

### Paso 3: Compilar y Ejecutar en Hostinger
Subí todo el proyecto (incluyendo `package.json`, `vite.config.ts`, `src/`, etc.) utilizando File Manager o Git Integration, y desde la consola SSH de Hostinger ejecuta:
```bash
npm install
npm run build
```
Una vez compilado, iniciá la aplicación desde el panel de Hostinger. El servidor backend de Express servirá tanto las rutas de API como la interfaz estática optimizada de React en producción.

---

## ✅ Lista de Verificación de SEO Post-Despliegue
Para asegurar que tu posicionamiento en Google y buscadores sea óptimo:
1. **Google Search Console**: Da de alta tu dominio en Google Search Console para monitorear el rastreo e indexación de tus profesores individuales (`/profesor/:id`).
2. **Sitemap**: Podés generar un archivo `sitemap.xml` para que Google rastree de inmediato las páginas de profesores.
3. **Optimización WebP Activa**: Recordá que la galería de profesores ya está optimizada con conversión automática a WebP, lo cual garantiza que la velocidad de carga en dispositivos móviles califique con puntaje excelente en *Google PageSpeed Insights*.
