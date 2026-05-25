const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const sedesController = {
    listar: async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM sedes WHERE activo = true ORDER BY nombre ASC');
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Sedes obtenidas correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar sedes: ' + err.message }]);
        }
    },

    crear: async (req, res) => {
        const { nombre, direccion } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO sedes (nombre, direccion) VALUES ($1, $2) RETURNING *',
                [nombre, direccion]
            );
            return sendResponse(res, 201, true, result.rows[0], [{ code: 'CREATE_SUCCESS', message: 'Sede creada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'CREATE_ERROR', message: 'Error al crear sede: ' + err.message }]);
        }
    },

    actualizar: async (req, res) => {
        const { id } = req.params;
        const { nombre, direccion } = req.body;
        try {
            const result = await pool.query(
                'UPDATE sedes SET nombre = $1, direccion = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
                [nombre, direccion, id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Sede no encontrada' }]);
            }
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'UPDATE_SUCCESS', message: 'Sede actualizada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'UPDATE_ERROR', message: 'Error al actualizar sede: ' + err.message }]);
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('UPDATE sedes SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Sede no encontrada' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'DELETE_SUCCESS', message: 'Sede desactivada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'DELETE_ERROR', message: 'Error al desactivar sede: ' + err.message }]);
        }
    }
};

module.exports = sedesController;