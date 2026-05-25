const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Rutas protegidas: Solo Admins pueden listar, actualizar y desactivar
router.get('/', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), usuariosController.listar);
router.get('/perfil', verifyToken, usuariosController.obtenerPerfil); // Cualquier usuario logueado puede ver su perfil
router.put('/cambiar-password', verifyToken, usuariosController.cambiarPassword); // Cambio de password propio
router.get('/mis-cursos', verifyToken, usuariosController.listarMisCursos); // Estudiantes y otros pueden ver sus cursos
router.post('/:id/totp-setup', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR']), usuariosController.configurarTotp);
router.put('/:id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), usuariosController.actualizar);
router.delete('/:id', verifyToken, checkRole(['SUPERADMIN']), usuariosController.eliminar); // Solo superadmin elimina usuarios por seguridad

// Gestión de asignaciones Usuario-Aula
router.post('/asignar-aula', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), usuariosController.asignarAula);
router.post('/remover-aula', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE']), usuariosController.removerAula);

module.exports = router;