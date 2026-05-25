const express = require('express');
const router = express.Router();
const sedesController = require('../controllers/sedes.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas protegidas: Solo los Admins pueden gestionar sedes
router.get('/', verifyToken, sedesController.listar);
router.post('/', verifyToken, checkRole(['SUPERADMIN']), sedesController.crear);
router.put('/:id', verifyToken, checkRole(['SUPERADMIN']), sedesController.actualizar);
router.delete('/:id', verifyToken, checkRole(['SUPERADMIN']), sedesController.eliminar);

module.exports = router;