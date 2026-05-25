const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const periodosController = {
    listarPeriodos: async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM periodos_academicos WHERE activo = true ORDER BY fecha_inicio DESC');
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Periodos académicos obtenidos correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar periodos: ' + err.message }]);
        }
    },

    crearPeriodo: async (req, res) => {
        const { nombre, fecha_inicio, fecha_fin } = req.body;
        
        if (!nombre || !fecha_inicio || !fecha_fin) {
            return sendResponse(res, 400, false, null, [{ code: 'MISSING_FIELDS', message: 'Todos los campos son obligatorios' }]);
        }

        try {
            const result = await pool.query(
                'INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin) VALUES ($1, $2, $3) RETURNING *',
                [nombre, fecha_inicio, fecha_fin]
            );
            return sendResponse(res, 201, true, result.rows[0], [{ code: 'CREATE_SUCCESS', message: 'Periodo académico creado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'CREATE_ERROR', message: 'Error al crear periodo académico: ' + err.message }]);
        }
    },

    obtenerPeriodoActivo: async (req, res) => {
        try {
            // 1. PRIORIDAD MÁXIMA: ¿Hoy corresponde a algún periodo por fechas?
            let result = await pool.query(
                'SELECT * FROM periodos_academicos WHERE activo = true AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin LIMIT 1'
            );
            
            // 2. SEGUNDA PRIORIDAD: Si hoy no hay clases (vacaciones), ¿hay uno marcado manualmente?
            if (result.rowCount === 0) {
                result = await pool.query('SELECT * FROM periodos_academicos WHERE es_activo = true AND activo = true LIMIT 1');
            }

            // 3. TERCERA PRIORIDAD: El último que terminó (para ver reportes recientes en vacaciones)
            if (result.rowCount === 0) {
                result = await pool.query(
                    'SELECT * FROM periodos_academicos WHERE activo = true AND fecha_fin < CURRENT_DATE ORDER BY fecha_fin DESC LIMIT 1'
                );
            }

            // 4. CUARTA PRIORIDAD: El más próximo a empezar
            if (result.rowCount === 0) {
                result = await pool.query(
                    'SELECT * FROM periodos_academicos WHERE activo = true ORDER BY fecha_inicio ASC LIMIT 1'
                );
            }

            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'No se encontraron periodos académicos configurados' }]);
            }

            return sendResponse(res, 200, true, result.rows[0], [{ code: 'GET_SUCCESS', message: 'Periodo académico determinado correctamente por calendario' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al obtener periodo: ' + err.message }]);
        }
    },

    obtenerPeriodoPorId: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('SELECT * FROM periodos_academicos WHERE id = $1 AND activo = true', [id]);
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Periodo académico no encontrado' }]);
            }
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'GET_SUCCESS', message: 'Periodo obtenido correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al obtener periodo: ' + err.message }]);
        }
    },

    actualizarPeriodo: async (req, res) => {
        const { id } = req.params;
        const { nombre, fecha_inicio, fecha_fin } = req.body;
        try {
            const result = await pool.query(
                'UPDATE periodos_academicos SET nombre = $1, fecha_inicio = $2, fecha_fin = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND activo = true RETURNING *',
                [nombre, fecha_inicio, fecha_fin, id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Periodo académico no encontrado o inactivo' }]);
            }
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'UPDATE_SUCCESS', message: 'Periodo actualizado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'UPDATE_ERROR', message: 'Error al actualizar periodo: ' + err.message }]);
        }
    },

    activarPeriodo: async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Desactivar todos los periodos
            await client.query('UPDATE periodos_academicos SET es_activo = false, updated_at = CURRENT_TIMESTAMP');
            
            // 2. Activar el seleccionado
            const result = await client.query(
                'UPDATE periodos_academicos SET es_activo = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND activo = true RETURNING *',
                [id]
            );

            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Periodo académico no encontrado' }]);
            }

            await client.query('COMMIT');
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'ACTIVATE_SUCCESS', message: 'Periodo académico activado correctamente' }]);
        } catch (err) {
            await client.query('ROLLBACK');
            return sendResponse(res, 500, false, null, [{ code: 'ACTIVATE_ERROR', message: 'Error al activar periodo: ' + err.message }]);
        } finally {
            client.release();
        }
    },

    eliminarPeriodo: async (req, res) => {
        const { id } = req.params;
        try {
            // Borrado lógico
            const result = await pool.query(
                'UPDATE periodos_academicos SET activo = false, es_activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', 
                [id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Periodo académico no encontrado' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'DELETE_SUCCESS', message: 'Periodo académico eliminado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'DELETE_ERROR', message: 'Error al eliminar periodo: ' + err.message }]);
        }
    }
};

module.exports = periodosController;
