# 📚 Documentación de API - Sistema Institucional QR

Esta documentación detalla los endpoints disponibles para el frontend `Q-assistant`.

**Base URL:** `http://localhost:3000/api`

---

## 🔑 Autenticación
Gestión de sesiones y registro inicial.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/auth/login` | Login de usuario | `{email, password}` | `{ token, user: {id, nombre, documento, rol} }` | No |
| POST | `/auth/register` | Registro de usuarios | `{nombre, documento, email, password, rol, sede_id}` | `{ userId }` | Sí (Superadmin) |

---

## 🏢 Sedes
Gestión de sedes físicas de la institución.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/sedes` | Listar sedes | - | `[{id, nombre, direccion, ...}]` | Sí (Admin) |
| POST | `/sedes` | Crear sede | `{nombre, direccion}` | `{id, nombre, direccion, ...}` | Sí (Superadmin) |
| PUT | `/sedes/:id` | Actualizar sede | `{nombre, direccion}` | `{id, nombre, direccion, ...}` | Sí (Superadmin) |
| DELETE | `/sedes/:id` | Desactivar sede | - | `null` | Sí (Superadmin) |

---

## 🏫 Aulas
Gestión de salones por sede.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/aulas` | Listar todas | - | `[{id, sede_id, nombre, ...}]` | Sí (Admin) |
| GET | `/aulas/sede/:sid` | Listar por sede | - | `[{id, sede_id, nombre, ...}]` | Sí (Admin) |
| POST | `/aulas` | Crear aula | `{sede_id, nombre}` | `{id, sede_id, nombre, ...}` | Sí (Admin) |
| PUT | `/aulas/:id` | Actualizar aula | `{sede_id, nombre}` | `{id, sede_id, nombre, ...}` | Sí (Admin) |
| DELETE | `/aulas/:id` | Desactivar aula | - | `null` | Sí (Admin) |

---

## 👤 Usuarios
Gestión de personal y estudiantes.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/usuarios` | Listar usuarios | Query: `?rol&sede_id` | `[{id, nombre_completo, documento_identidad, email, rol, ...}]` | Sí (Admin) |
| PUT | `/usuarios/:id` | Editar usuario | `{nombre_completo, documento_identidad, email, rol, sede_id, [password]}` | `{id, nombre_completo, email, rol}` | Sí (Admin) |
| DELETE | `/usuarios/:id` | Desactivar usuario | - | `null` | Sí (Superadmin) |
| POST | `/usuarios/:id/totp-setup`| Generar TOTP | - | `{secret, otpauth, qrCodeDataURL}` | Sí (Admin/Profe) |
| POST | `/usuarios/asignar-aula` | Vincular a aula | `{usuario_id, aula_id}` | `{usuario_id, aula_id, activo, ...}` | Sí (Admin) |
| POST | `/usuarios/remover-aula` | Desvincular | `{usuario_id, aula_id}` | `null` | Sí (Admin) |

---

## 🕒 Horarios
Configuración de horas de clase por aula.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/horarios` | Listar todos | Query: `?aula_id` | `[{id, aula_id, dia_semana, hora_inicio, hora_fin, ...}]` | Sí (Admin) |
| GET | `/horarios/aula/:aid` | Horarios de aula | - | `[{id, aula_id, dia_semana, hora_inicio, hora_fin, ...}]` | Sí (Admin) |
| POST | `/horarios` | Crear horario | `{aula_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos}` | `{id, aula_id, ...}` | Sí (Admin) |
| PUT | `/horarios/:id` | Editar horario | `{aula_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos}` | `{id, ...}` | Sí (Admin) |
| DELETE | `/horarios/:id` | Desactivar | - | `null` | Sí (Admin) |

---

## 📸 Asistencia
Registro y validación dinámica de entrada/salida.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/asistencia/marcar` | Marcar asistencia | `{documento_identidad, token, aula_id}` | `{id, usuario_id, aula_id, tipo, fecha_hora}` | Sí (Profe/Admin) |
| GET | `/asistencia/mi-historial` | Historial personal | Query: `?aula_id` | `[{id, tipo, fecha_hora, aula_nombre, sede_nombre}]` | Sí (Estudiante) |

---

## 🎓 Estudiantes (Mis Datos)
Consultas específicas para el perfil del estudiante.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/usuarios/mis-cursos` | Listar mis aulas | - | `[{aula_id, aula_nombre, sede_nombre, docente_nombre}]` | Sí (Estudiante) |
| GET | `/usuarios/perfil` | Ver mi perfil | - | `{id, nombre_completo, documento_identidad, email, rol, sede_nombre, tiene_totp, ...}` | Sí (Cualquiera) |
| PUT | `/usuarios/cambiar-password` | Cambiar mi clave | `{currentPassword, newPassword}` | `null` | Sí (Cualquiera) |

---

## 📝 Justificaciones
Gestión de inasistencias por parte de estudiantes y revisión por docentes.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/justificaciones` | Enviar justificación | `{motivo, fecha_falta}` | `{id, motivo, fecha_falta, estado, ...}` | Sí (Estudiante) |
| GET | `/justificaciones/mis-justificaciones` | Ver mis solicitudes | - | `[{id, motivo, fecha_falta, estado, ...}]` | Sí (Estudiante) |
| GET | `/justificaciones` | Listar todas | Query: `?estado&usuario_id` | `[{id, estudiante_nombre, motivo, estado, ...}]` | Sí (Admin/Profe) |
| PUT | `/justificaciones/:id/estado` | Aprobar/Rechazar | `{estado: 'APROBADA'}` | `{id, estado, aprobado_por, ...}` | Sí (Admin/Profe) |

---

## 📅 Periodos Académicos
Gestión de Ciclos, Bimestres o Semestres.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/periodos` | Listar periodos | - | `[{id, nombre, fecha_inicio, fecha_fin, es_activo, ...}]` | Sí (Todos) |
| GET | `/periodos/activo` | Ver periodo actual | - | `{id, nombre, fecha_inicio, fecha_fin, es_activo, ...}` | Sí (Todos) |
| POST | `/periodos` | Crear periodo | `{nombre, fecha_inicio, fecha_fin}` | `{id, nombre, ...}` | Sí (Admin) |
| PUT | `/periodos/:id` | Editar periodo | `{nombre, fecha_inicio, fecha_fin}` | `{id, ...}` | Sí (Admin) |
| PATCH | `/periodos/:id/activar` | Activar periodo | - | `{id, es_activo: true, ...}` | Sí (Admin) |
| DELETE | `/periodos/:id` | Desactivar (borrado lógico) | - | `null` | Sí (Admin) |

---

## 🏖️ Días No Lectivos (Feriados)
Gestión de feriados nacionales o suspensiones por sede.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/feriados` | Listar feriados | Query: `?sede_id` | `[{id, fecha, motivo, sede_id, ...}]` | Sí (Todos) |
| POST | `/feriados` | Crear feriado | `{fecha, motivo, [sede_id]}` | `{id, fecha, motivo, ...}` | Sí (Admin) |
| PUT | `/feriados/:id` | Editar feriado | `{fecha, motivo, [sede_id]}` | `{id, ...}` | Sí (Admin) |
| DELETE | `/feriados/:id` | Eliminar (lógico) | - | `null` | Sí (Admin) |

---

## 🚫 Clases Suspendidas
Suspensiones específicas por aula (ausencia docente, fallas técnicas, etc).

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/clases-suspendidas` | Listar suspensiones | Query: `?aula_id` | `[{id, aula_id, fecha, motivo, ...}]` | Sí (Todos) |
| POST | `/clases-suspendidas` | Registrar suspensión | `{aula_id, fecha, motivo}` | `{id, aula_id, fecha, motivo, ...}` | Sí (Admin/Profe) |
| DELETE | `/clases-suspendidas/:id` | Anular suspensión | - | `null` | Sí (Admin/Profe) |

---

## 📊 Reportes
Cálculo dinámico de asistencias y faltas.

| Método | Ruta | Descripción | Body (JSON) | Respuesta Exitosa (Data) | Protegido |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/reportes/resumen-alumno/:usuario_id` | Resumen de asistencias/faltas | Query: `?aula_id, ?periodo_id, ?periodos` | `[{aula, resumen: {asistencias, faltas, ...}}]` | Sí (Estudiante/Admin) |
| GET | `/reportes/aula/:aula_id` | Reporte detallado por aula | Query: `?periodo_id, ?periodos, ?fecha_inicio, ?fecha_fin` | `{periodos, aula, reporte: [{estudiante, asistencia: [...]}]}` | Sí (Admin/Profe) |

---

## 💡 Notas para Frontend
1. **Formato Estándar:** Todas las respuestas siguen esta estructura:
   ```json
   {
     "isSuccess": boolean,
     "data": object | array | null,
     "messages": [
       { "code": "STRING_CODE", "message": "Descripción legible" }
     ]
   }
   ```
2. **Autenticación:** Enviar el token en el Header: `Authorization: Bearer <token>`.
3. **Roles permitidos:** `SUPERADMIN`, `ADMIN_SEDE`, `PROFESOR`, `ESTUDIANTE`.
4. **Validación TOTP:** El campo `token` en `/asistencia/marcar` debe ser el código de 6 dígitos generado localmente por el dispositivo del estudiante.
