const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const justificacionesController = {
    crear: async (req, res) => {
        const usuario_id = req.user.id;
        const { motivo, fecha_falta } = req.body;

        try {
            const result = await pool.query(
                `INSERT INTO justificaciones (usuario_id, motivo, fecha_falta) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [usuario_id, motivo, fecha_falta]
            );

            return sendResponse(res, 201, true, result.rows[0], [{ 
                code: 'JUSTIFICATION_CREATED', 
                message: 'Solicitud de justificación enviada correctamente' 
            }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ 
                code: 'SERVER_ERROR', 
                message: 'Error al crear justificación: ' + err.message 
            }]);
        }
    },

    listar: async (req, res) => {
        const { estado, usuario_id } = req.query;
        try {
            let query = `
                SELECT 
                    j.id, 
                    j.motivo, 
                    j.fecha_falta, 
                    j.estado, 
                    j.created_at,
                    u.nombre_completo as estudiante_nombre,
                    u.documento_identidad as estudiante_documento
                FROM justificaciones j
                JOIN usuarios u ON j.usuario_id = u.id
                WHERE j.activo = true
            `;
            const params = [];
            let paramIndex = 1;

            if (estado) {
                query += ` AND j.estado = $${paramIndex}`;
                params.push(estado);
                paramIndex++;
            }

            if (usuario_id) {
                query += ` AND j.usuario_id = $${paramIndex}`;
                params.push(usuario_id);
                paramIndex++;
            }

            query += ' ORDER BY j.created_at DESC';

            const result = await pool.query(query, params);
            return sendResponse(res, 200, true, result.rows, [{ 
                code: 'LIST_SUCCESS', 
                message: 'Justificaciones obtenidas correctamente' 
            }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ 
                code: 'SERVER_ERROR', 
                message: 'Error al listar justificaciones: ' + err.message 
            }]);
        }
    },

    actualizarEstado: async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body; // APROBADA o RECHAZADA
        const aprobado_por = req.user.id;

        try {
            const result = await pool.query(
                `UPDATE justificaciones 
                 SET estado = $1, aprobado_por = $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3 AND activo = true RETURNING *`,
                [estado, aprobado_por, id]
            );

            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ 
                    code: 'NOT_FOUND', 
                    message: 'Justificación no encontrada' 
                }]);
            }

            return sendResponse(res, 200, true, result.rows[0], [{ 
                code: 'UPDATE_SUCCESS', 
                message: `Justificación ${estado.toLowerCase()} correctamente` 
            }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ 
                code: 'SERVER_ERROR', 
                message: 'Error al actualizar justificación: ' + err.message 
            }]);
        }
    }
};

module.exports = justificacionesController;
