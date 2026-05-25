const express = require('express');
const router = express.Router();
const aulasController = require('../controllers/aulas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas protegidas: Solo Admins pueden gestionar aulas
router.get('/', verifyToken, aulasController.listar);
router.get('/sede/:sede_id', verifyToken, aulasController.listarPorSede);
router.post('/', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), aulasController.crear);
router.put('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), aulasController.actualizar);
router.delete('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), aulasController.eliminar);

module.exports = router;