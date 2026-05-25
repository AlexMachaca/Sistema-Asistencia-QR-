const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const aulasController = {
    listar: async (req, res) => {
        const { sede_id } = req.query;
        try {
            let query = 'SELECT * FROM aulas WHERE activo = true';
            const params = [];
            
            if (sede_id) {
                query += ' AND sede_id = $1';
                params.push(sede_id);
            }
            
            query += ' ORDER BY nombre ASC';
            
            const result = await pool.query(query, params);
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Aulas obtenidas correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar aulas: ' + err.message }]);
        }
    },

    listarPorSede: async (req, res) => {
        const { sede_id } = req.params;
        try {
            const result = await pool.query(
                'SELECT * FROM aulas WHERE sede_id = $1 AND activo = true ORDER BY nombre ASC',
                [sede_id]
            );
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Aulas de la sede obtenidas correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar aulas por sede: ' + err.message }]);
        }
    },

    crear: async (req, res) => {
        const { sede_id, nombre } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO aulas (sede_id, nombre) VALUES ($1, $2) RETURNING *',
                [sede_id, nombre]
            );
            return sendResponse(res, 201, true, result.rows[0], [{ code: 'CREATE_SUCCESS', message: 'Aula creada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'CREATE_ERROR', message: 'Error al crear aula: ' + err.message }]);
        }
    },

    actualizar: async (req, res) => {
        const { id } = req.params;
        const { sede_id, nombre } = req.body;
        try {
            const result = await pool.query(
                'UPDATE aulas SET sede_id = $1, nombre = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
                [sede_id, nombre, id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Aula no encontrada' }]);
            }
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'UPDATE_SUCCESS', message: 'Aula actualizada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'UPDATE_ERROR', message: 'Error al actualizar aula: ' + err.message }]);
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('UPDATE aulas SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Aula no encontrada' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'DELETE_SUCCESS', message: 'Aula desactivada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'DELETE_ERROR', message: 'Error al desactivar aula: ' + err.message }]);
        }
    }
};

module.exports = aulasController;