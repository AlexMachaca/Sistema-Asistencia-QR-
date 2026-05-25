const express = require('express');
const router = express.Router();
const justificacionesController = require('../controllers/justificaciones.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Estudiantes pueden crear sus justificaciones y ver las suyas
router.post('/', verifyToken, checkRole(['ESTUDIANTE']), justificacionesController.crear);
router.get('/mis-justificaciones', verifyToken, (req, res, next) => {
    req.query.usuario_id = req.user.id;
    next();
}, justificacionesController.listar);

// Admin y Profesores pueden listar todas y actualizar estado
router.get('/', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR']), justificacionesController.listar);
router.put('/:id/estado', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR']), justificacionesController.actualizarEstado);

module.exports = router;
