const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Resumen consolidado para un alumno (Puede verlo el alumno, el docente o el admin)
router.get('/resumen-alumno/:usuario_id', verifyToken, reportesController.resumenAlumno);

// Reporte detallado por aula y fechas (Solo Admin y Profesores)
router.get('/aula/:aula_id', verifyToken, checkRole(['SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR']), reportesController.reporteAula);

module.exports = router;
