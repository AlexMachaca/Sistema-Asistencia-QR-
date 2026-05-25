const express = require('express');
const router = express.Router();
const clasesSuspendidasController = require('../controllers/clases-suspendidas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas protegidas
router.get('/', verifyToken, clasesSuspendidasController.listar);

// Rutas administrativas y para profesores
router.post('/', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR']), clasesSuspendidasController.crear);
router.delete('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR']), clasesSuspendidasController.eliminar);

module.exports = router;
