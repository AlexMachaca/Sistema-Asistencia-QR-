const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateSecret, generateURI } = require('otplib');
const QRCode = require('qrcode');
const { sendResponse } = require('../utils/response.util');

const usuariosController = {
    listar: async (req, res) => {
        const { rol, sede_id } = req.query;
        try {
            let query = 'SELECT id, nombre_completo, documento_identidad, email, rol, sede_id, activo, created_at FROM usuarios WHERE activo = true';
            const params = [];
            let paramIndex = 1;

            if (rol) {
                query += ` AND rol = $${paramIndex}`;
                params.push(rol);
                paramIndex++;
            }

            if (sede_id) {
                query += ` AND sede_id = $${paramIndex}`;
                params.push(sede_id);
                paramIndex++;
            }

            query += ' ORDER BY nombre_completo ASC';

            const result = await pool.query(query, params);
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Usuarios obtenidos correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar usuarios: ' + err.message }]);
        }
    },

    actualizar: async (req, res) => {
        const { id } = req.params;
        const { nombre_completo, documento_identidad, email, password, rol, sede_id } = req.body;
        
        try {
            let query = 'UPDATE usuarios SET nombre_completo = $1, documento_identidad = $2, email = $3, rol = $4, sede_id = $5, updated_at = CURRENT_TIMESTAMP';
            const params = [nombre_completo, documento_identidad, email, rol, sede_id];
            
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query += `, password_hash = $6`;
                params.push(hashedPassword);
                query += ` WHERE id = $7 RETURNING id, nombre_completo, email, rol`;
                params.push(id);
            } else {
                query += ` WHERE id = $6 RETURNING id, nombre_completo, email, rol`;
                params.push(id);
            }

            const result = await pool.query(query, params);

            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Usuario no encontrado' }]);
            }
            return sendResponse(res, 200, true, result.rows[0], [{ code: 'UPDATE_SUCCESS', message: 'Usuario actualizado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'UPDATE_ERROR', message: 'Error al actualizar usuario (revisa que el email o documento no estén duplicados): ' + err.message }]);
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('UPDATE usuarios SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [id]);
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Usuario no encontrado' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'DELETE_SUCCESS', message: 'Usuario desactivado correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'DELETE_ERROR', message: 'Error al desactivar usuario: ' + err.message }]);
        }
    },

    configurarTotp: async (req, res) => {
        const { id } = req.params;
        try {
            const userResult = await pool.query('SELECT email, totp_secret FROM usuarios WHERE id = $1', [id]);
            if (userResult.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Usuario no encontrado' }]);
            }

            let secret = userResult.rows[0].totp_secret;
            if (!secret) {
                secret = generateSecret();
                await pool.query('UPDATE usuarios SET totp_secret = $1 WHERE id = $2', [secret, id]);
            }

            const otpauth = generateURI({ issuer: 'SistemaQR', label: userResult.rows[0].email, secret });
            const qrCodeDataURL = await QRCode.toDataURL(otpauth);

            return sendResponse(res, 200, true, { secret, otpauth, qrCodeDataURL }, [{ code: 'TOTP_SETUP_SUCCESS', message: 'Configuración TOTP obtenida' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al configurar TOTP: ' + err.message }]);
        }
    },

    // Relación Usuarios <-> Aulas
    asignarAula: async (req, res) => {
        const { usuario_id, aula_id } = req.body;
        try {
            // Upsert: Si ya existe la relación (pero inactiva), la activamos. Si no, la creamos.
            const result = await pool.query(
                `INSERT INTO usuarios_aulas (usuario_id, aula_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT (usuario_id, aula_id) 
                 DO UPDATE SET activo = true, updated_at = CURRENT_TIMESTAMP 
                 RETURNING *`,
                [usuario_id, aula_id]
            );
            return sendResponse(res, 201, true, result.rows[0], [{ code: 'ASSIGN_SUCCESS', message: 'Aula asignada al usuario correctamente' }]);
        } catch (err) {
            return sendResponse(res, 400, false, null, [{ code: 'ASSIGN_ERROR', message: 'Error al asignar aula: ' + err.message }]);
        }
    },

    removerAula: async (req, res) => {
        const { usuario_id, aula_id } = req.body;
        try {
            const result = await pool.query(
                'UPDATE usuarios_aulas SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND aula_id = $2 RETURNING *',
                [usuario_id, aula_id]
            );
            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Relación usuario-aula no encontrada' }]);
            }
            return sendResponse(res, 200, true, null, [{ code: 'REMOVE_SUCCESS', message: 'Aula removida del usuario correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'REMOVE_ERROR', message: 'Error al remover aula: ' + err.message }]);
        }
    },

    listarMisCursos: async (req, res) => {
        const usuario_id = req.user.id; // Extraído del token por el middleware
        try {
            const query = `
                SELECT 
                    a.id as aula_id, 
                    a.nombre as aula_nombre,
                    s.nombre as sede_nombre,
                    (
                        SELECT u.nombre_completo 
                        FROM usuarios u
                        JOIN usuarios_aulas ua2 ON u.id = ua2.usuario_id
                        WHERE ua2.aula_id = a.id AND u.rol = 'PROFESOR' AND ua2.activo = true
                        LIMIT 1
                    ) as docente_nombre
                FROM aulas a
                JOIN usuarios_aulas ua ON a.id = ua.aula_id
                JOIN sedes s ON a.sede_id = s.id
                WHERE ua.usuario_id = $1 AND ua.activo = true
            `;
            const result = await pool.query(query, [usuario_id]);
            return sendResponse(res, 200, true, result.rows, [{ code: 'LIST_SUCCESS', message: 'Cursos obtenidos correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al listar cursos: ' + err.message }]);
        }
    },

    obtenerPerfil: async (req, res) => {
        const usuario_id = req.user.id;
        try {
            const query = `
                SELECT 
                    u.id, 
                    u.nombre_completo, 
                    u.documento_identidad, 
                    u.email, 
                    u.rol, 
                    u.sede_id, 
                    s.nombre as sede_nombre,
                    (CASE WHEN u.totp_secret IS NOT NULL THEN true ELSE false END) as tiene_totp,
                    u.created_at
                FROM usuarios u
                LEFT JOIN sedes s ON u.sede_id = s.id
                WHERE u.id = $1 AND u.activo = true
            `;
            const result = await pool.query(query, [usuario_id]);

            if (result.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Usuario no encontrado' }]);
            }

            return sendResponse(res, 200, true, result.rows[0], [{ code: 'PROFILE_SUCCESS', message: 'Perfil obtenido correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al obtener perfil: ' + err.message }]);
        }
    },

    cambiarPassword: async (req, res) => {
        const usuario_id = req.user.id;
        const { currentPassword, newPassword } = req.body;

        try {
            // 1. Obtener el hash actual
            const userRes = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [usuario_id]);
            if (userRes.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Usuario no encontrado' }]);
            }

            // 2. Verificar contraseña actual
            const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
            if (!isMatch) {
                return sendResponse(res, 401, false, null, [{ code: 'INVALID_PASSWORD', message: 'La contraseña actual es incorrecta' }]);
            }

            // 3. Hashear y actualizar
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await pool.query('UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, usuario_id]);

            return sendResponse(res, 200, true, null, [{ code: 'PASSWORD_CHANGED', message: 'Contraseña actualizada correctamente' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al cambiar contraseña: ' + err.message }]);
        }
    }
};

module.exports = usuariosController;
