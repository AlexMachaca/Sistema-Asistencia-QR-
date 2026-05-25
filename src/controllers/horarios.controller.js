const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const horariosController = {
    listar: async (req, res) => {
        const { aula_id } = req.query;
        try {
            let query = 'SELECT * FROM horarios WHERE activo = true';
            const params = [];
            
            if (aula_id) {
                query += ' AND aula_id = $1';
                params.push(aula_id);
            }
            
            query += ' ORDER BY dia_semana ASC, hora_inicio ASC';
            
            const result = await pool.query(query, params);
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Horarios obtenidos correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar horarios: ' + err.message }]);
        }
    },

    listarPorAula: async (req, res) => {
        const { aula_id } = req.params;
        try {
            const result = await pool.query(
                'SELECT * FROM horarios WHERE aula_id = $1 AND activo = true ORDER BY dia_semana ASC, hora_inicio ASC',
                [aula_id]
            );
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Horarios del aula obtenidos correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar horarios por aula: ' + err.message }]);
        }
    },

    crear: async (req, res) => {
        const { aula_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos } = req.body;
        try {
            // 1. Validar solapamiento (Overlap)
            // Lógica: (Nuevo_Inicio < Existente_Fin) AND (Nuevo_Fin > Existente_Inicio)
            const overlapCheck = await pool.query(
                `SELECT id FROM horarios 
                 WHERE aula_id = $1 AND dia_semana = $2 AND activo = true
                 AND ($3 < hora_fin AND $4 > hora_inicio)`,
                [aula_id, dia_semana, hora_inicio, hora_fin]
            );

            if (overlapCheck.rowCount > 0) {
                return sendResponse(res, 400, false, null, [{ 
                    code: 'OVERLAP_ERROR', 
                    message: 'El horario se solapa con otra clase ya programada en esta aula y día.' 
                }]);
            }

            const result = await pool.query(
                'INSERT INTO horarios (aula_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [aula_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos || 15]
            );
            return sendResponse(res, 201, true, result.rows[0], [{ code: 'CREATE_SUCCESS', message: 'Horario creado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'CREATE_ERROR', message: 'Error al crear horario: ' + err.message }]);
        }
    },

    actualizar: async (req, res) => {
        const { id } = req.params;
        const { aula_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos } = req.body;
        try {
            // 1. Validar solapamiento excluyendo el registro actual
            const overlapCheck = await pool.query(
                `SELECT id FROM horarios 
                 WHERE aula_id = $1 AND dia_semana = $2 AND activo = true AND id != $3
                 AND ($4 < hora_fin AND $5 > hora_inicio)`,
                [aula_id, dia_semana, id, hora_inicio, hora_fin]
            );

            if (overlapCheck.rowCount > 0) {
                return sendResponse(res, 400, false, null, [{ 
                    code: 'OVERLAP_ERROR', 
                    message: 'El horario se solapa con otra clase ya programada.' 
                }]);
            }

            const result = await pool.query(
                'UPDATE horarios SET aula_id = $1, dia_semana = $2, hora_inicio = $3, hora_fin = $4, tolerancia_minutos = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
                [aula_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos, id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Horario no encontrado' }]);
            }
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'UPDATE_SUCCESS', message: 'Horario actualizado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'UPDATE_ERROR', message: 'Error al actualizar horario: ' + err.message }]);
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('UPDATE horarios SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Horario no encontrado' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'DELETE_SUCCESS', message: 'Horario desactivado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'DELETE_ERROR', message: 'Error al desactivar horario: ' + err.message }]);
        }
    }
};

module.exports = horariosController;