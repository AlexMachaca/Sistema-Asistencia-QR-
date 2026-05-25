const { pool } = require('./src/config/db');

async function debugDB() {
    try {
        console.log("🔍 Investigando estructura de la tabla 'registros'...");
        const res = await pool.query(`
            SELECT 
                conname as constraint_name, 
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'registros'::regclass;
        `);
        console.table(res.rows);
        
        console.log("\n🧪 Intentando una inserción manual de prueba con 'ASISTIO'...");
        try {
            await pool.query("INSERT INTO registros (usuario_id, aula_id, tipo) VALUES (1, 1, 'ASISTIO')");
            console.log("✅ ¡Éxito! La base de datos aceptó 'ASISTIO'.");
        } catch (err) {
            console.error("❌ Error en inserción de prueba:", err.message);
        }
    } catch (err) {
        console.error("❌ Error al consultar metadatos:", err.message);
    } finally {
        process.exit();
    }
}

debugDB();
