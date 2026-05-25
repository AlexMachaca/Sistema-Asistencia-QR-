const express = require('express');
const router = express.Router();
const feriadosController = require('../controllers/feriados.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas protegidas por token
router.get('/', verifyToken, feriadosController.listar);

// Rutas administrativas
router.post('/', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), feriadosController.crear);
router.put('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), feriadosController.actualizar);
router.delete('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), feriadosController.eliminar);

module.exports = router;
