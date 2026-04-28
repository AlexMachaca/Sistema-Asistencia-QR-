const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const app = express();
const db = new Database('control_asistencia.db');
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN ---
app.use(express.json());
app.use(express.static('public'));

// --- CREACIÓN DE TABLAS ---
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

app.post('/api/marcar', (req, res) => {
    const { codigo_qr } = req.body; 
    const usuario = db.prepare('SELECT id FROM usuarios WHERE codigo_qr = ?').get(codigo_qr);

    if (!usuario) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const ultimoRegistro = db.prepare(`
        SELECT tipo FROM registros 
        WHERE usuario_id = ? AND date(fecha_hora, '-5 hours') = date('now', '-5 hours')
        ORDER BY id DESC LIMIT 1
    `).get(usuario.id);

    let nuevoTipo = 'ENTRADA';
    if (ultimoRegistro && ultimoRegistro.tipo === 'ENTRADA') {
        nuevoTipo = 'SALIDA';
    }

    db.prepare('INSERT INTO registros (usuario_id, tipo) VALUES (?, ?)').run(usuario.id, nuevoTipo);
    res.json({ success: true, message: `Registro de ${nuevoTipo} exitoso`, tipo: nuevoTipo });
});

app.post('/api/usuarios', (req, res) => {
    const { nombre, codigo_qr } = req.body;
    try {
        db.prepare('INSERT INTO usuarios (nombre, codigo_qr) VALUES (?, ?)').run(nombre, codigo_qr);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, message: 'El código QR ya existe o hay un error' });
    }
});

app.get('/api/usuarios', (req, res) => {
    const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY nombre ASC').all();
    res.json(usuarios);
});

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

function getLocalIps() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ name, address: iface.address });
            }
        }
    }
    return ips;
}

app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIps();
    const hostname = os.hostname();
    console.log(`🚀 Servidor listo!`);
    console.log(`- En este PC:  http://localhost:${PORT}`);
    
    console.log(`- En la red (usa la de Wi-Fi):`);
    ips.forEach(ip => {
        console.log(`  > http://${ip.address}:${PORT}  (${ip.name})`);
    });
    
    console.log(`- Por nombre:  http://${hostname}.local:${PORT}`);
    console.log(`\n⚠️  IMPORTANTE: Para usar la cámara en el celular necesitas HTTPS.`);
    console.log(`   Puedes usar: npx localtunnel --port ${PORT}`);
});