const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDB } = require('./config/db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar DB
initDB();

// Rutas
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/sedes', require('./routes/sedes.routes'));
app.use('/api/aulas', require('./routes/aulas.routes'));
app.use('/api/horarios', require('./routes/horarios.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/asistencia', require('./routes/asistencia.routes'));
app.use('/api/justificaciones', require('./routes/justificaciones.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/periodos', require('./routes/periodos.routes'));
app.use('/api/feriados', require('./routes/feriados.routes'));
app.use('/api/clases-suspendidas', require('./routes/clases-suspendidas.routes'));

module.exports = app;