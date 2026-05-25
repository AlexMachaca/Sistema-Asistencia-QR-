const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistencia.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Registro de asistencia validando TOTP (Solo el que escanea: Profesor o Admin)
router.post('/marcar', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR']), asistenciaController.registrar);

// Consultar historial personal (Protegido por JWT)
router.get('/mi-historial', verifyToken, asistenciaController.listarMiHistorial);

module.exports = router;
