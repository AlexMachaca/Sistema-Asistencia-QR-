const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('control_asistencia.db'); // Esto crea el archivo automáticamente
const PORT = 3000;

// --- CONFIGURACIÓN ---
app.use(express.json()); // Permite que Express entienda datos JSON enviados desde el frontend
app.use(express.static('public')); // Sirve tus archivos HTML, CSS y JS desde la carpeta 'public'

// --- CREACIÓN DE TABLAS ---
// Usamos "run" para ejecutar comandos SQL
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    codigo_qr TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    tipo TEXT CHECK(tipo IN ('ENTRADA', 'SALIDA')),
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );
`);

// --- RUTAS DE LA API ---

// 1. Obtener todos los registros para el historial (con filtros opcionales)
app.get('/api/historial', (req, res) => {
    const { inicio, fin } = req.query;
    let query = `
        SELECT r.id, u.nombre, r.tipo, r.fecha_hora 
        FROM registros r 
        JOIN usuarios u ON r.usuario_id = u.id 
    `;
    let params = [];

    if (inicio && fin) {
        query += ` WHERE date(r.fecha_hora, '-5 hours') >= ? AND date(r.fecha_hora, '-5 hours') <= ? `;
        params.push(inicio, fin);
    }

    query += ` ORDER BY r.fecha_hora DESC LIMIT 200`;

    const rows = db.prepare(query).all(...params);
    res.json(rows);
});

// 2. Registrar una entrada o salida inteligente mediante QR
app.post('/api/marcar', (req, res) => {
    const { codigo_qr } = req.body; 

    // Buscamos si el usuario existe por su código QR
    const usuario = db.prepare('SELECT id FROM usuarios WHERE codigo_qr = ?').get(codigo_qr);

    if (!usuario) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Buscamos el último registro del usuario en el día de hoy según horario de Perú (UTC-5)
    const ultimoRegistro = db.prepare(`
        SELECT tipo FROM registros 
        WHERE usuario_id = ? AND date(fecha_hora, '-5 hours') = date('now', '-5 hours')
        ORDER BY id DESC LIMIT 1
    `).get(usuario.id);

    // Si no hay registros hoy o el último fue SALIDA, marcamos ENTRADA.
    // Si el último fue ENTRADA, marcamos SALIDA.
    let nuevoTipo = 'ENTRADA';
    if (ultimoRegistro && ultimoRegistro.tipo === 'ENTRADA') {
        nuevoTipo = 'SALIDA';
    }

    // Insertamos el registro
    db.prepare('INSERT INTO registros (usuario_id, tipo) VALUES (?, ?)').run(usuario.id, nuevoTipo);
    
    res.json({ success: true, message: `Registro de ${nuevoTipo} exitoso`, tipo: nuevoTipo });
});

// 3. Crear un nuevo usuario
app.post('/api/usuarios', (req, res) => {
    const { nombre, codigo_qr } = req.body;
    try {
        db.prepare('INSERT INTO usuarios (nombre, codigo_qr) VALUES (?, ?)').run(nombre, codigo_qr);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: 'El código QR ya existe o hay un error' });
    }
});

// 4. Obtener todos los usuarios (para gestión)
app.get('/api/usuarios', (req, res) => {
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nombre ASC').all();
    res.json(usuarios);
});

// 5. Actualizar usuario
app.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, codigo_qr } = req.body;
    try {
        db.prepare('UPDATE usuarios SET nombre = ?, codigo_qr = ? WHERE id = ?').run(nombre, codigo_qr, id);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Error al actualizar o código QR duplicado' });
    }
});

// 6. Eliminar usuario e historial
app.delete('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    try {
        const transaccion = db.transaction(() => {
            db.prepare('DELETE FROM registros WHERE usuario_id = ?').run(id);
            db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
        });
        transaccion();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
});

// 7. Estadísticas del Dashboard
app.get('/api/estadisticas', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM registros WHERE date(fecha_hora, '-5 hours') = date('now', '-5 hours')) as totalHoy,
                (SELECT COUNT(*) FROM (
                    SELECT r1.usuario_id FROM registros r1
                    WHERE date(r1.fecha_hora, '-5 hours') = date('now', '-5 hours')
                    AND r1.id = (
                        SELECT MAX(id) FROM registros r2 
                        WHERE r2.usuario_id = r1.usuario_id 
                        AND date(r2.fecha_hora, '-5 hours') = date('now', '-5 hours')
                    )
                    AND r1.tipo = 'ENTRADA'
                )) as presentesAhora
        `).get();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});