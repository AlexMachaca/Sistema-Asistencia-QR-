const { pool } = require('../config/db');
const { sendResponse } = require('../utils/response.util');

const reportesController = {
    resumenAlumno: async (req, res) => {
        const { usuario_id } = req.params;
        const { aula_id, periodo_id, periodos } = req.query;

        try {
            // 0. Determinar los periodos a consultar
            let periodosConsultar = [];
            if (periodo_id) {
                const pRes = await pool.query('SELECT * FROM periodos_academicos WHERE id = $1 AND activo = true', [periodo_id]);
                if (pRes.rowCount > 0) periodosConsultar.push(pRes.rows[0]);
            } else if (periodos) {
                const ids = periodos.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                if (ids.length > 0) {
                    const pRes = await pool.query('SELECT * FROM periodos_academicos WHERE id = ANY($1) AND activo = true ORDER BY fecha_inicio ASC', [ids]);
                    periodosConsultar = pRes.rows;
                }
            } else {
                // Por defecto, periodo inteligente (FECHA HOY > manual activo > último finalizado)
                let pRes = await pool.query('SELECT * FROM periodos_academicos WHERE activo = true AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin LIMIT 1');
                
                if (pRes.rowCount === 0) {
                    pRes = await pool.query('SELECT * FROM periodos_academicos WHERE es_activo = true AND activo = true LIMIT 1');
                }
                
                if (pRes.rowCount === 0) {
                    pRes = await pool.query('SELECT * FROM periodos_academicos WHERE activo = true AND fecha_fin < CURRENT_DATE ORDER BY fecha_fin DESC LIMIT 1');
                }
                
                if (pRes.rowCount > 0) periodosConsultar.push(pRes.rows[0]);
            }

            if (periodosConsultar.length === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'No se encontraron periodos académicos para la consulta' }]);
            }

            // 1. Obtener información básica del alumno y sus aulas
            let aulasQuery = `
                SELECT a.id, a.nombre as aula_nombre, s.nombre as sede_nombre, s.id as sede_id
                FROM aulas a
                JOIN usuarios_aulas ua ON a.id = ua.aula_id
                JOIN sedes s ON a.sede_id = s.id
                WHERE ua.usuario_id = $1 AND ua.activo = true
            `;
            const aulasParams = [usuario_id];
            if (aula_id) {
                aulasQuery += ' AND a.id = $2';
                aulasParams.push(aula_id);
            }
            const aulasRes = await pool.query(aulasQuery, aulasParams);

            if (aulasRes.rowCount === 0) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'No se encontraron aulas para este alumno' }]);
            }

            const reporteFinal = [];
            const hoy = new Date();

            for (const aula of aulasRes.rows) {
                // 2. Obtener horarios de esta aula
                const horariosRes = await pool.query(
                    'SELECT dia_semana FROM horarios WHERE aula_id = $1 AND activo = true',
                    [aula.id]
                );
                const diasClase = horariosRes.rows.map(h => h.dia_semana);

                // 2.1. Obtener días no lectivos (feriados) aplicables
                const feriadosRes = await pool.query(
                    'SELECT fecha::date FROM dias_no_lectivos WHERE activo = true AND (sede_id IS NULL OR sede_id = $1)',
                    [aula.sede_id]
                );
                const fechasFeriados = feriadosRes.rows.map(f => f.fecha.toISOString().split('T')[0]);

                // 2.2. Obtener clases suspendidas específicas de esta aula
                const suspendidasRes = await pool.query(
                    'SELECT fecha::date FROM clases_suspendidas WHERE aula_id = $1 AND activo = true',
                    [aula.id]
                );
                const fechasSuspendidas = suspendidasRes.rows.map(s => s.fecha.toISOString().split('T')[0]);

                // 3. Obtener registros de asistencia reales
                const registrosRes = await pool.query(
                    `SELECT tipo, fecha_hora::date as fecha FROM registros 
                     WHERE usuario_id = $1 AND aula_id = $2 AND activo = true`,
                    [usuario_id, aula.id]
                );
                
                const asistencias = registrosRes.rows.filter(r => r.tipo === 'ASISTIO').length;
                const tardanzas = registrosRes.rows.filter(r => r.tipo === 'TARDANZA').length;
                const fechasConRegistro = registrosRes.rows.map(r => r.fecha.toISOString().split('T')[0]);

                // 4. Obtener justificaciones aprobadas
                const justificacionesRes = await pool.query(
                    `SELECT fecha_falta::date as fecha FROM justificaciones 
                     WHERE usuario_id = $1 AND estado = 'APROBADA' AND activo = true`,
                    [usuario_id]
                );
                const fechasJustificadas = justificacionesRes.rows.map(j => j.fecha.toISOString().split('T')[0]);

                // 5. Calcular Clases Programadas y Faltas recorriendo cada periodo seleccionado
                let clasesProgramadasCount = 0;
                let faltasInjustificadas = 0;
                let faltasJustificadas = 0;

                for (const periodo of periodosConsultar) {
                    let tempDate = new Date(periodo.fecha_inicio);
                    const fechaFinPeriodo = new Date(periodo.fecha_fin);
                    const limiteCalculo = hoy < fechaFinPeriodo ? hoy : fechaFinPeriodo;

                    while (tempDate <= limiteCalculo) {
                        const diaSemana = tempDate.getUTCDay() === 0 ? 7 : tempDate.getUTCDay();
                        const fechaStr = tempDate.toISOString().split('T')[0];

                        if (diasClase.includes(diaSemana)) {
                            // Si es feriado, no se cuenta como clase programada
                            if (fechasFeriados.includes(fechaStr)) {
                                tempDate.setDate(tempDate.getDate() + 1);
                                continue;
                            }

                            // Si la clase específica está suspendida, tampoco se cuenta
                            if (fechasSuspendidas.includes(fechaStr)) {
                                tempDate.setDate(tempDate.getDate() + 1);
                                continue;
                            }

                            clasesProgramadasCount++;
                            
                            if (!fechasConRegistro.includes(fechaStr)) {
                                if (fechasJustificadas.includes(fechaStr)) {
                                    faltasJustificadas++;
                                } else {
                                    faltasInjustificadas++;
                                }
                            }
                        }
                        tempDate.setDate(tempDate.getDate() + 1);
                    }
                }

                reporteFinal.push({
                    aula: aula.aula_nombre,
                    sede: aula.sede_nombre,
                    periodos: periodosConsultar.map(p => p.nombre).join(', '),
                    resumen: {
                        clases_totales: clasesProgramadasCount,
                        asistencias,
                        tardanzas,
                        faltas_justificadas: faltasJustificadas,
                        faltas_injustificadas: faltasInjustificadas,
                        porcentaje_asistencia: clasesProgramadasCount > 0 
                            ? (((asistencias + tardanzas) / clasesProgramadasCount) * 100).toFixed(2) + '%' 
                            : '0%'
                    }
                });
            }

            return sendResponse(res, 200, true, reporteFinal, [{ code: 'REPORT_SUCCESS', message: 'Reporte generado con éxito' }]);
        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al generar reporte: ' + err.message }]);
        }
    },

    reporteAula: async (req, res) => {
        const { aula_id } = req.params;
        const { fecha_inicio, fecha_fin, periodo_id, periodos } = req.query;

        try {
            // 0. Determinar los periodos a consultar
            let periodosConsultar = [];
            if (periodo_id) {
                const pRes = await pool.query('SELECT * FROM periodos_academicos WHERE id = $1 AND activo = true', [periodo_id]);
                if (pRes.rowCount > 0) periodosConsultar.push(pRes.rows[0]);
            } else if (periodos) {
                const ids = periodos.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                if (ids.length > 0) {
                    const pRes = await pool.query('SELECT * FROM periodos_academicos WHERE id = ANY($1) AND activo = true ORDER BY fecha_inicio ASC', [ids]);
                    periodosConsultar = pRes.rows;
                }
            } else if (!fecha_inicio && !fecha_fin) {
                // Por defecto, periodo activo
                const pRes = await pool.query('SELECT * FROM periodos_academicos WHERE es_activo = true AND activo = true LIMIT 1');
                if (pRes.rowCount > 0) periodosConsultar.push(pRes.rows[0]);
            }

            // Si no hay periodos y no hay fechas manuales, error
            if (periodosConsultar.length === 0 && !fecha_inicio) {
                return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'No se encontraron periodos o rango de fechas para la consulta' }]);
            }

            // Definir rangos globales para el pre-fetching si es manual
            let inicioGlobal, finGlobal;
            if (periodosConsultar.length > 0) {
                inicioGlobal = new Date(Math.min(...periodosConsultar.map(p => new Date(p.fecha_inicio))));
                finGlobal = new Date(Math.max(...periodosConsultar.map(p => new Date(p.fecha_fin))));
            } else {
                inicioGlobal = new Date(fecha_inicio);
                finGlobal = new Date(fecha_fin || new Date());
            }

            const hoy = new Date();

            // 1. PRE-FETCHING DE DATOS (Consultas Estáticas)
            
            // 1.1. Información del aula y sede
            const aulaInfo = await pool.query('SELECT sede_id, nombre FROM aulas WHERE id = $1', [aula_id]);
            if (aulaInfo.rowCount === 0) return sendResponse(res, 404, false, null, [{ code: 'NOT_FOUND', message: 'Aula no encontrada' }]);
            const sedeId = aulaInfo.rows[0].sede_id;

            // 1.2. Alumnos del aula
            const alumnosRes = await pool.query(
                `SELECT u.id, u.nombre_completo, u.documento_identidad 
                 FROM usuarios u
                 JOIN usuarios_aulas ua ON u.id = ua.usuario_id
                 WHERE ua.aula_id = $1 AND ua.activo = true AND u.rol = 'ESTUDIANTE'
                 ORDER BY u.nombre_completo ASC`,
                [aula_id]
            );

            // 1.3. Horarios
            const horariosRes = await pool.query('SELECT dia_semana FROM horarios WHERE aula_id = $1 AND activo = true', [aula_id]);
            const diasClase = horariosRes.rows.map(h => h.dia_semana);

            // 1.4. Feriados
            const feriadosRes = await pool.query(
                'SELECT fecha::date FROM dias_no_lectivos WHERE activo = true AND (sede_id IS NULL OR sede_id = $1) AND fecha BETWEEN $2 AND $3',
                [sedeId, inicioGlobal, finGlobal]
            );
            const fechasFeriados = feriadosRes.rows.map(f => f.fecha.toISOString().split('T')[0]);

            // 1.5. Clases Suspendidas
            const suspendidasRes = await pool.query(
                'SELECT fecha::date FROM clases_suspendidas WHERE aula_id = $1 AND activo = true AND fecha BETWEEN $2 AND $3',
                [aula_id, inicioGlobal, finGlobal]
            );
            const fechasSuspendidas = suspendidasRes.rows.map(s => s.fecha.toISOString().split('T')[0]);

            // 1.6. TODOS los registros de asistencia del aula en el rango
            const registrosRes = await pool.query(
                `SELECT usuario_id, tipo, fecha_hora::date as fecha FROM registros 
                 WHERE aula_id = $1 AND activo = true AND fecha_hora::date BETWEEN $2 AND $3`,
                [aula_id, inicioGlobal, finGlobal]
            );
            
            const mapaRegistros = {};
            registrosRes.rows.forEach(r => {
                const key = `${r.usuario_id}_${r.fecha.toISOString().split('T')[0]}`;
                mapaRegistros[key] = r.tipo;
            });

            // 1.7. TODAS las justificaciones aprobadas del rango
            const justRes = await pool.query(
                `SELECT usuario_id, fecha_falta::date as fecha FROM justificaciones 
                 WHERE estado = 'APROBADA' AND activo = true AND fecha_falta BETWEEN $1 AND $2`,
                [inicioGlobal, finGlobal]
            );
            
            const mapaJustificaciones = {};
            justRes.rows.forEach(j => {
                const key = `${j.usuario_id}_${j.fecha.toISOString().split('T')[0]}`;
                mapaJustificaciones[key] = true;
            });

            // 2. CONSTRUCCIÓN DEL REPORTE EN MEMORIA
            const reporte = [];

            for (const alumno of alumnosRes.rows) {
                const detalleAsistencia = [];

                // Definir qué rangos iterar
                let rangosIterar = [];
                if (periodosConsultar.length > 0) {
                    rangosIterar = periodosConsultar.map(p => ({
                        inicio: new Date(p.fecha_inicio),
                        fin: new Date(p.fecha_fin),
                        nombre: p.nombre
                    }));
                } else {
                    rangosIterar.push({ inicio: inicioGlobal, fin: finGlobal, nombre: 'Manual' });
                }

                for (const rango of rangosIterar) {
                    let tempDate = new Date(rango.inicio);
                    const limiteCalculo = hoy < rango.fin ? hoy : rango.fin;

                    while (tempDate <= limiteCalculo) {
                        const diaSemana = tempDate.getUTCDay() === 0 ? 7 : tempDate.getUTCDay();
                        const fechaStr = tempDate.toISOString().split('T')[0];
                        const key = `${alumno.id}_${fechaStr}`;

                        if (diasClase.includes(diaSemana)) {
                            let estado = 'FALTA';

                            if (fechasFeriados.includes(fechaStr)) {
                                estado = 'FERIADO';
                            } else if (fechasSuspendidas.includes(fechaStr)) {
                                estado = 'SUSPENDIDO';
                            } else if (mapaRegistros[key]) {
                                estado = mapaRegistros[key];
                            } else if (mapaJustificaciones[key]) {
                                estado = 'JUSTIFICADO';
                            }

                            detalleAsistencia.push({ fecha: fechaStr, estado, periodo: rango.nombre });
                        }
                        tempDate.setDate(tempDate.getDate() + 1);
                    }
                }

                reporte.push({
                    estudiante: alumno.nombre_completo,
                    documento: alumno.documento_identidad,
                    asistencia: detalleAsistencia
                });
            }

            return sendResponse(res, 200, true, { 
                periodos: periodosConsultar.map(p => p.nombre).join(', ') || 'Rango Manual', 
                aula: aulaInfo.rows[0].nombre,
                reporte 
            }, [{ code: 'REPORT_SUCCESS', message: 'Reporte de aula generado con éxito' }]);

        } catch (err) {
            return sendResponse(res, 500, false, null, [{ code: 'SERVER_ERROR', message: 'Error al generar reporte de aula: ' + err.message }]);
        }
    }
};

module.exports = reportesController;
