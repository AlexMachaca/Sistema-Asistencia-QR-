const express = require('express');
const router = express.Router();
const horariosController = require('../controllers/horarios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas protegidas: Solo Admins pueden gestionar horarios
router.get('/', verifyToken, horariosController.listar);
router.get('/aula/:aula_id', verifyToken, horariosController.listarPorAula);
router.post('/', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), horariosController.crear);
router.put('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), horariosController.actualizar);
router.delete('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), horariosController.eliminar);

module.exports = router;