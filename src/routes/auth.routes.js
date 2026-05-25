const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

router.post('/login', authController.login);

// Solo el SUPERADMIN puede registrar nuevos usuarios Admin o Profesores en esta fase inicial
router.post('/register', authController.register); 

module.exports = router;