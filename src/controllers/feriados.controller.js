const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const feriadosController = {
    listar: async (req, res) => {
        const { sede_id } = req.query;
        try {
            let query = 'SELECT * FROM dias_no_lectivos WHERE activo = true';
            const params = [];

            if (sede_id) {
                query += ' AND (sede_id IS NULL OR sede_id = $1)';
                params.push(sede_id);
            }

            query += ' ORDER BY fecha ASC';
            const result = await pool.query(query, params);
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Feriados obtenidos correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar feriados: ' + err.message }]);
        }
    },

    crear: async (req, res) => {
        const { fecha, motivo, sede_id } = req.body;
        
        if (!fecha || !motivo) {
            return sendResponse(res, 400, false, null, [{ code: 'MISSING_FIELDS', message: 'Fecha y motivo son obligatorios' }]);
        }

        try {
            const result = await pool.query(
                'INSERT INTO dias_no_lectivos (fecha, motivo, sede_id) VALUES ($1, $2, $3) RETURNING *',
                [fecha, motivo, sede_id || null]
            );
            return sendResponse(res, 201, true, result.rows[0], [{ code: 'CREATE_SUCCESS', message: 'Feriado creado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'CREATE_ERROR', message: 'Error al crear feriado: ' + err.message }]);
        }
    },

    actualizar: async (req, res) => {
        const { id } = req.params;
        const { fecha, motivo, sede_id } = req.body;
        try {
            const result = await pool.query(
                'UPDATE dias_no_lectivos SET fecha = $1, motivo = $2, sede_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND activo = true RETURNING *',
                [fecha, motivo, sede_id || null, id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Feriado no encontrado' }]);
            }
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'UPDATE_SUCCESS', message: 'Feriado actualizado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'UPDATE_ERROR', message: 'Error al actualizar feriado: ' + err.message }]);
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(
                'UPDATE dias_no_lectivos SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', 
                [id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Feriado no encontrado' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'DELETE_SUCCESS', message: 'Feriado eliminado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'DELETE_ERROR', message: 'Error al eliminar feriado: ' + err.message }]);
        }
    }
};

module.exports = feriadosController;
