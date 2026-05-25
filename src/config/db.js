const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
    try {
        // ATENCIÓN: Solo ejecutaremos esto temporalmente para limpiar las tablas viejas
        //await pool.query(`DROP TABLE IF EXISTS justificaciones, registros, usuarios_aulas, usuarios, horarios, aulas, sedes CASCADE;`);

        await pool.query(`
            -- TABLA CLASES SUSPENDIDAS
            CREATE TABLE IF NOT EXISTS clases_suspendidas (
                id SERIAL PRIMARY KEY,
                aula_id INTEGER REFERENCES aulas(id) NOT NULL,
                fecha DATE NOT NULL,
                motivo VARCHAR(255) NOT NULL,
                registrado_por INTEGER REFERENCES usuarios(id) NOT NULL,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA DÍAS NO LECTIVOS (Feriados)
            CREATE TABLE IF NOT EXISTS dias_no_lectivos (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                motivo VARCHAR(255) NOT NULL,
                sede_id INTEGER REFERENCES sedes(id), -- NULL significa feriado nacional/global
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA PERIODOS ACADÉMICOS
            CREATE TABLE IF NOT EXISTS periodos_academicos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NOT NULL,
                es_activo BOOLEAN DEFAULT FALSE,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA SEDES
            CREATE TABLE IF NOT EXISTS sedes (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                direccion TEXT,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA AULAS
            CREATE TABLE IF NOT EXISTS aulas (
                id SERIAL PRIMARY KEY,
                sede_id INTEGER REFERENCES sedes(id),
                nombre VARCHAR(255) NOT NULL,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA HORARIOS
            CREATE TABLE IF NOT EXISTS horarios (
                id SERIAL PRIMARY KEY,
                aula_id INTEGER REFERENCES aulas(id),
                dia_semana INTEGER CHECK (dia_semana BETWEEN 1 AND 7), -- 1:Lunes, 7:Domingo
                hora_inicio TIME NOT NULL,
                hora_fin TIME NOT NULL,
                tolerancia_minutos INTEGER DEFAULT 15,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA USUARIOS
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre_completo VARCHAR(255) NOT NULL,
                documento_identidad VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                rol VARCHAR(50) CHECK (rol IN ('SUPERADMIN', 'ADMIN_SEDE', 'PROFESOR', 'ESTUDIANTE')),
                totp_secret TEXT,
                sede_id INTEGER REFERENCES sedes(id),
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA USUARIOS_AULAS (Relación muchos a muchos)
            CREATE TABLE IF NOT EXISTS usuarios_aulas (
                usuario_id INTEGER REFERENCES usuarios(id),
                aula_id INTEGER REFERENCES aulas(id),
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (usuario_id, aula_id)
            );

            -- TABLA REGISTROS
            CREATE TABLE IF NOT EXISTS registros (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id),
                aula_id INTEGER REFERENCES aulas(id),
                tipo VARCHAR(50) CHECK (tipo IN ('ASISTIO', 'TARDANZA')),
                fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- TABLA JUSTIFICACIONES
            CREATE TABLE IF NOT EXISTS justificaciones (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id),
                motivo TEXT NOT NULL,
                fecha_falta DATE NOT NULL,
                estado VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
                aprobado_por INTEGER REFERENCES usuarios(id),
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Sistema Institucional: Tablas verificadas/creadas con éxito (Antiguas eliminadas).");
    } catch (err) {
        console.error("❌ Error al inicializar la base de datos institucional:", err.message);
    }
};

module.exports = {
    pool,
    initDB
};