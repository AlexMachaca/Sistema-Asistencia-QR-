# 🚀 Sistema de Control de Asistencia mediante QR

Un sistema web ligero, moderno y eficiente para gestionar el control de entradas y salidas de personal utilizando códigos QR. Diseñado para ser ejecutado localmente o en un servidor privado.

## ✨ Características Principales

- 📱 **Escáner Inteligente:** Detección automática de Entrada/Salida basada en el historial diario del usuario.
- 📊 **Dashboard en Tiempo Real:** Visualización instantánea de personas presentes y total de movimientos del día.
- 👥 **Gestión de Usuarios (CRUD):** Panel completo para registrar, editar, buscar y eliminar usuarios.
- 🎫 **Generación de Fichas QR:** Crea credenciales visuales para los usuarios, listas para imprimir o descargar como imagen.
- 🔊 **Feedback Auditivo:** Sonidos de éxito y error integrados para una mejor experiencia de usuario al escanear.
- 📅 **Historial Filtrable:** Consulta de registros por rangos de fecha con ajuste automático a la hora de Perú (UTC-5).
- 📥 **Exportación a Excel:** Descarga reportes detallados en formato `.xlsx` con un solo clic.

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** & **Express**
- **SQLite** (vía `better-sqlite3`) para almacenamiento ligero y rápido.

### Frontend
- **HTML5 / JavaScript** (Vanilla JS)
- **PicoCSS** para una interfaz minimalista y elegante.
- **Bibliotecas:**
  - `html5-qrcode` (Escaneo de cámara)
  - `qrcodejs` (Generación de códigos)
  - `html2canvas` (Descarga de fichas como imagen)
  - `SheetJS` (Exportación a Excel)

## 🚀 Instalación y Uso

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/sistema-qr.git
   cd sistema-qr
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor:**
   ```bash
   node server.js
   ```

4. **Acceder a la aplicación:**
   Abre tu navegador en `http://localhost:3000`

## 📁 Estructura del Proyecto

```text
sistema-qr/
├── server.js           # Servidor Express y lógica de API
├── control_asistencia.db # Base de datos SQLite (se crea automáticamente)
├── package.json        # Configuración de Node y dependencias
└── public/             # Archivos del frontend
    └── index.html      # Interfaz única (SPA)
```

## 🔒 Notas de Seguridad y Configuración
- El sistema utiliza la zona horaria `America/Lima`. Si deseas cambiarla, ajusta los offsets de `-5 hours` en las consultas SQL de `server.js` y el locale en `index.html`.
- Se recomienda usar HTTPS si se planea acceder a la cámara desde dispositivos móviles.

---
Desarrollado con ❤️ para mejorar la gestión de asistencia.
