const { pool } = require('../config/db');
const { verify } = require('otplib');
const { sendResponse } = require('../utils/response.util');

const asistenciaController = {
    registrar: async (req, res) => {
        const { documento_identidad, token, aula_id } = req.body;

        try {
            // 1. Buscar usuario por documento
            const userResult = await pool.query(
                'SELECT id, totp_secret, rol FROM usuarios WHERE documento_identidad = $1 AND activo = true',
                [documento_identidad]
            );

            if (userResult.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' }]);
            }

            const user = userResult.rows[0];

            // 2. Validar TOTP
            if (!user.totp_secret) {
                return sendResponse(res, 400, false, null, [{ code: 'TOTP_NOT_CONFIGURED', message: 'El usuario no tiene configurado el QR dinámico' }]);
            }

            const isValid = verify({ token, secret: user.totp_secret });
            if (!isValid) {
                return sendResponse(res, 401, false, null, [{ code: 'INVALID_TOKEN', message: 'Token de seguridad inválido o expirado' }]);
            }

            // 3. Verificar si el usuario está asignado al aula
            const asignacion = await pool.query(
                'SELECT * FROM usuarios_aulas WHERE usuario_id = $1 AND aula_id = $2 AND activo = true',
                [user.id, aula_id]
            );
            if (asignacion.rowCount === 0) {
                return sendResponse(res, 403, false, null, [{ code: 'NOT_ASSIGNED', message: 'El estudiante no está asignado a esta aula' }]);
            }

            // --- NUEVA LÓGICA DE VALIDACIÓN ---

            // A. Validar Doble Marcado por Día
            const hoyStr = new Date().toISOString().split('T')[0];
            const duplicado = await pool.query(
                'SELECT id FROM registros WHERE usuario_id = $1 AND aula_id = $2 AND fecha_hora::date = $3 AND activo = true',
                [user.id, aula_id, hoyStr]
            );
            if (duplicado.rowCount > 0) {
                return sendResponse(res, 400, false, null, [{ code: 'ALREADY_REGISTERED', message: 'El estudiante ya registró su asistencia hoy para esta aula' }]);
            }

            // B. Lógica de Horario, Ventana de Tiempo y Estados
            const ahora = new Date();
            // Ajustar a hora local de Perú (UTC-5) si el servidor está en UTC
            // Esto es vital para comparar contra la tabla 'horarios' que usa TIME local
            const ahoraLocal = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
            
            const diaSemana = ahoraLocal.getUTCDay() === 0 ? 7 : ahoraLocal.getUTCDay();
            const horarioResult = await pool.query(
                `SELECT * FROM horarios WHERE aula_id = $1 AND dia_semana = $2 AND activo = true`,
                [aula_id, diaSemana]
            );

            if (horarioResult.rowCount === 0) {
                return sendResponse(res, 400, false, null, [{ code: 'NO_CLASS_TODAY', message: 'No hay clases programadas para esta aula el día de hoy' }]);
            }

            const horario = horarioResult.rows[0];
            
            // Convertir horas a minutos totales para facilitar cálculos
            const [hActual, mActual] = [ahoraLocal.getUTCHours(), ahoraLocal.getUTCMinutes()];
            const [hInicio, mInicio] = horario.hora_inicio.split(':').map(Number);
            const [hFin, mFin] = horario.hora_fin.split(':').map(Number);

            const minActual = hActual * 60 + mActual;
            const minInicio = hInicio * 60 + mInicio;
            const minFin = hFin * 60 + mFin;
            const duracionTotal = minFin - minInicio;
            const puntoMedio = minInicio + (duracionTotal / 2);

            // 1. Validar si es demasiado temprano (Anticipación máxima de 15 min)
            if (minActual < (minInicio - 15)) {
                return sendResponse(res, 400, false, null, [{ code: 'TOO_EARLY', message: 'Aún no es hora de marcar. Intenta 15 min antes de la clase.' }]);
            }

            // 2. Validar si ya es demasiado tarde (Punto medio de la clase)
            if (minActual > puntoMedio) {
                return sendResponse(res, 400, false, null, [{ code: 'TOO_LATE', message: 'Demasiado tarde. Se ha considerado como falta.' }]);
            }

            // 3. Determinar Estado (ASISTIO vs TARDANZA)
            let tipo = 'ASISTIO';
            if (minActual > (minInicio + horario.tolerancia_minutos)) {
                tipo = 'TARDANZA';
            }

            // 5. Registrar asistencia
            const registroResult = await pool.query(
                `INSERT INTO registros (usuario_id, aula_id, tipo) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [user.id, aula_id, tipo]
            );

            return sendResponse(res, 201, true, registroResult.rows[0], [{ 
                code: 'ATTENDANCE_SUCCESS', 
                message: `Asistencia registrada como ${tipo}` 
            }]);

        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al registrar asistencia: ' + err.message }]);
        }
    },

    listarMiHistorial: async (req, res) => {
        const usuario_id = req.user.id;
        const { aula_id } = req.query;

        try {
            let query = `
                SELECT 
                    r.id, 
                    r.tipo, 
                    r.fecha_hora, 
                    a.nombre as aula_nombre,
                    s.nombre as sede_nombre
                FROM registros r
                LEFT JOIN aulas a ON r.aula_id = a.id
                LEFT JOIN sedes s ON a.sede_id = s.id
                WHERE r.usuario_id = $1
            `;
            const params = [usuario_id];

            if (aula_id) {
                query += ' AND r.aula_id = $2';
                params.push(aula_id);
            }

            query += ' ORDER BY r.fecha_hora DESC';

            const result = await pool.query(query, params);
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Historial de asistencia obtenido correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al obtener historial: ' + err.message }]);
        }
    }
};

module.exports = asistenciaController;
