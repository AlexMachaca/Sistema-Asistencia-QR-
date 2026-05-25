const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const clasesSuspendidasController = {
    listar: async (req, res) => {
        const { aula_id } = req.query;
        try {
            let query = `
                SELECT cs.*, a.nombre as aula_nombre, u.nombre_completo as registrado_por_nombre
                FROM clases_suspendidas cs
                JOIN aulas a ON cs.aula_id = a.id
                JOIN usuarios u ON cs.registrado_por = u.id
                WHERE cs.activo = true
            `;
            const params = [];

            if (aula_id) {
                query += ' AND cs.aula_id = $1';
                params.push(aula_id);
            }

            query += ' ORDER BY cs.fecha DESC';
            const result = await pool.query(query, params);
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Suspensiones de clase obtenidas correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar clases suspendidas: ' + err.message }]);
        }
    },

    crear: async (req, res) => {
        const { aula_id, fecha, motivo } = req.body;
        const usuario_id = req.user.id;
        const rol = req.user.rol;
        
        if (!aula_id || !fecha || !motivo) {
            return sendResponse(res, 400, false, null, [{ code: 'MISSING_FIELDS', message: 'Todos los campos son obligatorios' }]);
        }

        try {
            // Validación de permisos para PROFESOR
            if (rol === 'PROFESOR') {
                const checkAula = await pool.query(
                    'SELECT 1 FROM usuarios_aulas WHERE usuario_id = $1 AND aula_id = $2 AND activo = true',
                    [usuario_id, aula_id]
                );
                if (checkAula.rowCount === 0) {
                    return sendResponse(res, 403, false, null, [{ code: 'FORBIDDEN', message: 'No tienes permiso para suspender clases en esta aula' }]);
                }
            }

            const result = await pool.query(
                'INSERT INTO clases_suspendidas (aula_id, fecha, motivo, registrado_por) VALUES ($1, $2, $3, $4) RETURNING *',
                [aula_id, fecha, motivo, usuario_id]
            );
            return sendResponse(res, 201, true, result.rows[0], [{ code: 'CREATE_SUCCESS', message: 'Clase suspendida registrada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'CREATE_ERROR', message: 'Error al registrar suspensión: ' + err.message }]);
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;
        const usuario_id = req.user.id;
        const rol = req.user.rol;

        try {
            // Si es PROFESOR, solo puede eliminar si él la registró o si pertenece al aula
            if (rol === 'PROFESOR') {
                const checkSuspension = await pool.query(
                    `SELECT cs.aula_id, cs.registrado_por 
                     FROM clases_suspendidas cs 
                     WHERE cs.id = $1 AND cs.activo = true`,
                    [id]
                );

                if (checkSuspension.rowCount === 0) {
                    return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Suspensión no encontrada' }]);
                }

                if (checkSuspension.rows[0].registrado_por !== usuario_id) {
                    // Si no la registró él, verificamos si pertenece al aula
                    const checkAula = await pool.query(
                        'SELECT 1 FROM usuarios_aulas WHERE usuario_id = $1 AND aula_id = $2 AND activo = true',
                        [usuario_id, checkSuspension.rows[0].aula_id]
                    );
                    if (checkAula.rowCount === 0) {
                        return sendResponse(res, 403, false, null, [{ code: 'FORBIDDEN', message: 'No tienes permiso para eliminar esta suspensión' }]);
                    }
                }
            }

            const result = await pool.query(
                'UPDATE clases_suspendidas SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', 
                [id]
            );
            
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Suspensión no encontrada' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'DELETE_SUCCESS', message: 'Suspensión de clase eliminada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'DELETE_ERROR', message: 'Error al eliminar suspensión: ' + err.message }]);
        }
    }
};

module.exports = clasesSuspendidasController;
