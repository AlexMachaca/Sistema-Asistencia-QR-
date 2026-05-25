const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response.util');

const authController = {
    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]);
            const user = result.rows[0];

            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return sendResponse(res, 401, false, null, [{ code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' }]);
            }

            const token = jwt.sign(
                { id: user.id, rol: user.rol, sede_id: user.sede_id },
                process.env.JWT_SECRET || 'secret_para_desarrollo',
                { expiresIn: '8h' }
            );

            return sendResponse(res, 200, true, {
                token,
                user: {
                    id: user.id,
                    nombre: user.nombre_completo,
                    documento: user.documento_identidad,
                    rol: user.rol
                }
            }, [{ code: 'LOGIN_SUCCESS', message: 'Inicio de sesión exitoso' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error en el servidor: ' + err.message }]);
        }
    },

    register: async (req, res) => {
        const { nombre, documento, email, password, rol, sede_id } = req.body;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                `INSERT INTO usuarios (nombre_completo, documento_identidad, email, password_hash, rol, sede_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [nombre, documento, email, hashedPassword, rol, sede_id]
            );
            return sendResponse(res, 201, true, { userId: result.rows[0].id }, [{ code: 'USER_CREATED', message: 'Usuario registrado con éxito' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'REGISTRATION_ERROR', message: 'Error al registrar usuario: ' + err.message }]);
        }
    }
};

module.exports = authController;