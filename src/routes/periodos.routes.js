const express = require('express');
const router = express.Router();
const periodosController = require('../controllers/periodos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas públicas (para todos los autenticados)
router.get('/', verifyToken, periodosController.listarPeriodos);
router.get('/activo', verifyToken, periodosController.obtenerPeriodoActivo);
router.get('/:id', verifyToken, periodosController.obtenerPeriodoPorId);

// Rutas administrativas
router.post('/', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), periodosController.crearPeriodo);
router.put('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), periodosController.actualizarPeriodo);
router.patch('/:id/activar', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), periodosController.activarPeriodo);
router.delete('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), periodosController.eliminarPeriodo);

module.exports = router;
