const { pool } = require('./src/config/db');
const bcrypt = require('bcryptjs');

const runSeed = async () => {
    const client = await pool.connect();
    try {
        console.log("🌱 Iniciando la siembra de datos (Seed)...");

        // Iniciar transacción
        await client.query('BEGIN');

        // 1. Limpiar datos previos si es necesario (Opcional, pero recomendado para un seed limpio)
        // ATENCIÓN: Esto borrará los datos actuales de estas tablas.
        await client.query('TRUNCATE TABLE justificaciones, registros, usuarios_aulas, usuarios, horarios, aulas, sedes RESTART IDENTITY CASCADE');

        // 2. Crear Sede
        const sedeRes = await client.query(
            'INSERT INTO sedes (nombre, direccion) VALUES ($1, $2) RETURNING id',
            ['Sede Central', 'Av. Universitaria 1234, Lima']
        );
        const sedeId = sedeRes.rows[0].id;
        console.log(`✅ Sede creada con ID: ${sedeId}`);

        // 3. Crear Aulas
        const aula1Res = await client.query(
            'INSERT INTO aulas (sede_id, nombre) VALUES ($1, $2) RETURNING id',
            [sedeId, 'Aula 101 - Laboratorio']
        );
        const aula1Id = aula1Res.rows[0].id;

        const aula2Res = await client.query(
            'INSERT INTO aulas (sede_id, nombre) VALUES ($1, $2) RETURNING id',
            [sedeId, 'Aula 202 - Teoria']
        );
        const aula2Id = aula2Res.rows[0].id;
        console.log(`✅ Aulas creadas: ${aula1Id}, ${aula2Id}`);

        // 4. Crear Usuarios
        const salt = await bcrypt.genSalt(10);
        const commonPassword = await bcrypt.hash('password123', salt);

        // Superadmin
        const adminRes = await client.query(
            'INSERT INTO usuarios (nombre_completo, documento_identidad, email, password_hash, rol, sede_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            ['Administrador del Sistema', '00000001', 'admin@sistema.com', commonPassword, 'SUPERADMIN', sedeId]
        );
        const adminId = adminRes.rows[0].id;

        // Profesor
        const profRes = await client.query(
            'INSERT INTO usuarios (nombre_completo, documento_identidad, email, password_hash, rol, sede_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            ['Profesor Juan Perez', '10000001', 'juan.perez@sistema.com', commonPassword, 'PROFESOR', sedeId]
        );
        const profId = profRes.rows[0].id;

        // Estudiantes
        const est1Res = await client.query(
            'INSERT INTO usuarios (nombre_completo, documento_identidad, email, password_hash, rol, sede_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            ['Estudiante Maria Garcia', '20000001', 'maria.garcia@sistema.com', commonPassword, 'ESTUDIANTE', sedeId]
        );
        const est1Id = est1Res.rows[0].id;

        const est2Res = await client.query(
            'INSERT INTO usuarios (nombre_completo, documento_identidad, email, password_hash, rol, sede_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            ['Estudiante Luis Torres', '20000002', 'luis.torres@sistema.com', commonPassword, 'ESTUDIANTE', sedeId]
        );
        const est2Id = est2Res.rows[0].id;

        console.log("✅ Usuarios creados (Admin, Profesor, 2 Estudiantes)");

        // 5. Asignar Usuarios a Aulas
        await client.query(
            'INSERT INTO usuarios_aulas (usuario_id, aula_id) VALUES ($1, $2), ($3, $4), ($5, $6)',
            [profId, aula1Id, est1Id, aula1Id, est2Id, aula1Id]
        );
        console.log("✅ Relaciones usuario-aula creadas");

        // 6. Crear Horarios
        await client.query(
            'INSERT INTO horarios (aula_id, dia_semana, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4)',
            [aula1Id, 1, '08:00:00', '10:00:00'] // Lunes de 8 a 10
        );
        console.log("✅ Horario de prueba creado");

        await client.query('COMMIT');
        console.log("✨ Seed completado con éxito.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error durante el seed:", err.message);
    } finally {
        client.release();
        process.exit();
    }
};

runSeed();
