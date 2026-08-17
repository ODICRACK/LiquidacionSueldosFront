import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { redondear, calcularFormula } from '../utils/mathEngine';
import { abrirReciboPDF } from '../utils/recibo';
import { useReactToPrint } from 'react-to-print';
import { ReciboPrint } from '../components/ReciboPrint';
import ModalCopiar from '../components/ModalCopiar';

export default function Liquidacion({ params }) {
    const [mostrarModalCopiar, setMostrarModalCopiar] = useState(false);
    const { id } = params;
    const [liquidacion, setLiquidacion] = useState(null);
    const [items, setItems] = useState([]);
    const [valoresCalculados, setValoresCalculados] = useState({});
    const [datosRecibo, setDatosRecibo] = useState(null);
    const reciboRef = useRef();

    useEffect(() => {
        cargarLiquidacion();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const manejarGeneracionPDF = () => {
        abrirReciboPDF(id);
    };

    const handleFinalizar = async () => {
        // --- NUEVA BARRERA DE SEGURIDAD ---
        const itemJornada = items.find(i => i.token === 'JHORAS');
        if (itemJornada && (!itemJornada.valor_ingresado || parseFloat(itemJornada.valor_ingresado) === 0)) {
            alert('¡Atención! Debe ingresar la Jornada de Horas (JHORAS) antes de finalizar. Si es jornada completa, ingrese 8.');
            return;
        }
        // -----------------------------------

        if (!window.confirm('¿Está seguro de finalizar? La liquidación quedará congelada y no podrá modificarse.')) return;

        try {
            await guardarBorradorSilencioso();
            await api.put(`/liquidaciones/${id}/finalizar`);
            alert('Liquidación finalizada correctamente.');
            cargarLiquidacion();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al finalizar.');
        }
    };

    const cargarLiquidacion = async () => {
        try {
            const res = await api.get(`/liquidaciones/${id}`);
            const data = res.data;
            let itemsCargados = data.items;

            // AUTO-RELLENO DE CALIDAD DE VIDA: 
            // Si el ítem SB está vacío, le inyectamos el sueldo guardado del empleado
            const idxSB = itemsCargados.findIndex(i => i.token === 'SB');
            if (idxSB !== -1 && !itemsCargados[idxSB].valor_ingresado && data.sueldo_basico) {
                itemsCargados[idxSB].valor_ingresado = data.sueldo_basico;
            }

            setLiquidacion(data);
            setItems(itemsCargados);
            recalcular(itemsCargados);
        } catch (error) {
            console.error('Error al cargar liquidación', error);
        }
    };

    // --- MOTOR DE CÁLCULO POR FASES CON LOS 5 GLOBALES SOLICITADOS ---
    // --- MOTOR DE CÁLCULO POR FASES ESTRICTAS (BASADO EN NATURALEZA) ---
    const recalcular = (itemsActuales) => {
        const contexto = {};
        const resultados = {};

        // 0. PRIORIDAD MÁXIMA: Variables de Tiempo (Antigüedad)
        let aniosAntiguedad = 0;
        if (liquidacion?.fecha_ingreso) {
            const ingreso = new Date(liquidacion.fecha_ingreso);
            aniosAntiguedad = liquidacion.anio - ingreso.getFullYear();
            if (liquidacion.mes < ingreso.getMonth() + 1) {
                aniosAntiguedad--;
            }
            aniosAntiguedad = Math.max(0, aniosAntiguedad);
        }
        contexto['ANIOS_ANTIGUEDAD'] = aniosAntiguedad;

        // Función interna para resolver fórmulas de un grupo específico
        const resolverLote = (loteItems) => {
            let pendientes = [...loteItems];
            let iteraciones = 0;
            const MAX_ITERACIONES = loteItems.length * 2;

            while (pendientes.length > 0 && iteraciones < MAX_ITERACIONES) {
                const faltantes = [];

                for (const item of pendientes) {
                    if (!item.activo) {
                        contexto[item.token] = 0;
                        resultados[item.id] = 0;
                        continue;
                    }

                    if (item.tipo === 'MANUAL') {
                        const val = redondear(parseFloat(item.valor_ingresado) || 0);
                        contexto[item.token] = val;
                        resultados[item.id] = val;
                    } else if (item.tipo === 'PORCENTAJE') {
                        if (item.base_token && contexto[item.base_token] === undefined) {
                            faltantes.push(item);
                            continue;
                        }
                        const porcentaje = parseFloat(item.porcentaje) || 0;
                        const base = item.base_token ? (contexto[item.base_token] || 0) : 100;
                        const val = redondear(porcentaje * base / 100);
                        contexto[item.token] = val;
                        resultados[item.id] = val;
                    } else if (item.tipo === 'FORMULA') {
                        const tokensNecesarios = item.formula.match(/[A-Z_]+/g) || [];
                        const todosResueltos = tokensNecesarios.every(t => contexto[t] !== undefined);

                        if (todosResueltos) {
                            const val = calcularFormula(item.formula, contexto);
                            contexto[item.token] = val;
                            resultados[item.id] = val;
                        } else {
                            faltantes.push(item);
                        }
                    }
                }
                pendientes = faltantes;
                iteraciones++;
            }
        };

        // Filtramos por Naturaleza para el orden estricto
        const auxiliares = itemsActuales.filter(i => i.naturaleza === 'AUXILIAR');
        const sumas = itemsActuales.filter(i => i.naturaleza === 'SUMA');
        const noRemunerativos = itemsActuales.filter(i => i.naturaleza === 'NO_REMUNERATIVO');
        const restas = itemsActuales.filter(i => i.naturaleza === 'RESTA');
        const informativos = itemsActuales.filter(i => i.naturaleza === 'INFORMATIVO');

        // --- FASE 1: AUXILIARES Y HABERES BASE ---
        resolverLote(auxiliares);

        // Calculamos solo los haberes que NO dependen de totales globales (Sueldo, Antigüedad, Presentismo)
        const sumasBase = sumas.filter(i => !i.formula?.includes('TOTAL_') && !i.base_token?.includes('TOTAL_'));
        resolverLote(sumasBase);

        // --- FASE 2: HABERES DEPENDIENTES (Horas Extras, Feriados) ---
        // Generamos un "Remunerativo Parcial" (Remuneración Normal y Habitual)
        let remParcial = 0;
        sumasBase.forEach(i => { if (i.activo) remParcial += (resultados[i.id] || 0) });

        // Engañamos temporalmente a la fórmula de las extras pasándole la suma base
        contexto['TOTAL_REMUNERATIVO'] = remParcial;

        const sumasDependientes = sumas.filter(i => i.formula?.includes('TOTAL_') || i.base_token?.includes('TOTAL_'));
        resolverLote(sumasDependientes);

        // --- FASE 3: NO REMUNERATIVOS ---
        resolverLote(noRemunerativos);

        // --- FASE 4: CONGELAMIENTO DE BRUTOS ---
        // Ahora sí, sumamos TODOS los haberes (Base + Extras de 288mil) para los Descuentos
        let totalRemFinal = 0;
        sumas.forEach(i => { if (i.activo) totalRemFinal += (resultados[i.id] || 0) });

        let totalNoRemFinal = 0;
        noRemunerativos.forEach(i => { if (i.activo) totalNoRemFinal += (resultados[i.id] || 0) });

        // Pisamos los valores globales con los números definitivos y exactos
        contexto['TOTAL_REMUNERATIVO'] = totalRemFinal;
        contexto['TOTAL_NO_REM'] = totalNoRemFinal;
        contexto['TOTAL_BRUTO'] = totalRemFinal + totalNoRemFinal;

        // --- FASE 5: DESCUENTOS (RESTAS) ---
        // Las retenciones ahora leen el TOTAL_REMUNERATIVO completo.
        resolverLote(restas);

        // --- FASE 6: CIERRE FINAL E INFORMATIVOS ---
        let totalDescFinal = 0;
        restas.forEach(i => { if (i.activo) totalDescFinal += (resultados[i.id] || 0) });

        contexto['TOTAL_DESCUENTOS'] = totalDescFinal;
        contexto['TOTAL_NETO'] = (totalRemFinal + totalNoRemFinal) - totalDescFinal;

        resolverLote(informativos);

        setValoresCalculados(resultados);
    };

    const handleItemChange = (itemId, campo, valor) => {
        const nuevosItems = items.map(item => {
            if (item.id === itemId) {
                return { ...item, [campo]: valor };
            }
            return item;
        });
        setItems(nuevosItems);
        recalcular(nuevosItems);
    };

    const guardarBorradorSilencioso = async () => {
        await api.put(`/liquidaciones/${id}/borrador`, {
            items,
            resultados: valoresCalculados
        });
    };

    const guardarBorrador = async () => {
        try {
            await guardarBorradorSilencioso();
            alert('Borrador guardado correctamente.');
        } catch {
            alert('Error al guardar el borrador.');
        }
    };

    const handleImprimirRecibo = async () => {
        try {
            // MAGIA: Guardamos el borrador silenciosamente ANTES de pedir el recibo
            await guardarBorradorSilencioso();

            const res = await api.get(`/liquidaciones/${id}/recibo`);
            setDatosRecibo(res.data);
            setTimeout(() => {
                triggerPrint();
            }, 100);
        } catch (error) {
            alert('Error al obtener los datos para el recibo.');
        }
    };

    const triggerPrint = useReactToPrint({
        contentRef: reciboRef,
        documentTitle: `Recibo_${id}`,
    });

    if (!liquidacion) return <div>Cargando...</div>;

    const calcularTotalesNuevos = () => {
        let remunerativos = 0;
        let noRemunerativos = 0;
        let descuentos = 0;
        let informativos = 0;

        items.forEach(item => {
            if (!item.activo) return;
            const val = valoresCalculados[item.id] || 0;

            if (item.naturaleza === 'SUMA') remunerativos += val;
            if (item.naturaleza === 'NO_REMUNERATIVO') noRemunerativos += val;
            if (item.naturaleza === 'RESTA') descuentos += val;
            if (item.naturaleza === 'INFORMATIVO') informativos += val;
        });

        const neto = (remunerativos + noRemunerativos) - descuentos;
        return { remunerativos, noRemunerativos, descuentos, informativos, neto };
    };

    const totales = calcularTotalesNuevos();
    const sueldoBasicoItem = items.find(i => i.token === 'SB');

    return (
        <div className="liquidacion-contenedor">
            <header className="liq-header">
                <h2>Liquidación: {liquidacion.mes}/{liquidacion.anio}</h2>
                <span className={`estado-badge ${liquidacion.estado.toLowerCase()}`}>{liquidacion.estado}</span>
            </header>

            {sueldoBasicoItem && (
                <div className="sueldo-basico">
                    <span className="sb-label">Sueldo Básico</span>
                    <div className="input-grupo">
                        <input
                            type="number" step="0.01" min="0"
                            value={sueldoBasicoItem.valor_ingresado || ''}
                            disabled={liquidacion.estado === 'FINALIZADA'}
                            onChange={(e) => handleItemChange(sueldoBasicoItem.id, 'valor_ingresado', e.target.value)}
                            placeholder="0.00"
                            onWheel={(e) => e.target.blur()}
                        />
                        <small className="base-hint">al guardar el borrador se actualiza en el empleado</small>
                    </div>
                </div>
            )}

            <table className="tabla-items-liq">
                <thead>
                    <tr>
                        <th>Activo</th>
                        <th>Concepto</th>
                        <th>Naturaleza</th>
                        <th>Valor / Fórmula</th>
                        <th>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Agrupamos y ordenamos visualmente */}
                    {['SUMA', 'NO_REMUNERATIVO', 'RESTA', 'AUXILIAR', 'INFORMATIVO'].map(nat => {
                        const itemsGrupo = items.filter(i => i.naturaleza === nat && i.token !== 'SB');
                        if (itemsGrupo.length === 0) return null;

                        return (
                            <React.Fragment key={nat}>
                                {/* Cabecera del Grupo */}
                                <tr className="fila-separador-grupo" style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                                    <td colSpan="5" style={{ padding: '8px', textTransform: 'uppercase' }}>{nat.replace('_', ' ')}</td>
                                </tr>

                                {/* Ítems del Grupo */}
                                {itemsGrupo.map(item => (
                                    <tr key={item.id} style={{ opacity: item.activo ? 1 : 0.4 }}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={item.activo}
                                                disabled={liquidacion.estado === 'FINALIZADA'}
                                                onChange={(e) => handleItemChange(item.id, 'activo', e.target.checked)}
                                            />
                                        </td>
                                        <td title={`Token: ${item.token}`}>
                                            <strong>{item.nombre}</strong>
                                            <small className="token-hint" style={{ display: 'block', color: '#666', fontSize: '0.85em' }}> ({item.token})</small>
                                        </td>
                                        <td>{item.naturaleza}</td>
                                        <td>
                                            {item.tipo === 'MANUAL' && (
                                                <input
                                                    type="number"
                                                    value={item.valor_ingresado || ''}
                                                    disabled={!item.activo || liquidacion.estado === 'FINALIZADA'}
                                                    onChange={(e) => handleItemChange(item.id, 'valor_ingresado', e.target.value)}
                                                    placeholder="0.00"
                                                    onWheel={(e) => e.target.blur()}
                                                />
                                            )}
                                            {item.tipo === 'PORCENTAJE' && (
                                                <div className="input-grupo">
                                                    <input
                                                        type="number" step="0.01"
                                                        value={item.porcentaje || ''}
                                                        disabled={!item.activo || liquidacion.estado === 'FINALIZADA'}
                                                        onChange={(e) => handleItemChange(item.id, 'porcentaje', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                    />
                                                    <span>%</span>
                                                    {item.base_token && <small className="base-hint">de {item.base_token}</small>}
                                                </div>
                                            )}
                                            {item.tipo === 'FORMULA' && <span>{item.formula}</span>}
                                        </td>
                                        <td className="resultado-celda">
                                            $ {valoresCalculados[item.id]?.toFixed(2) || '0.00'}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            <div className="totales-liq">
                <div className="total-fila">
                    <span>Remunerativos:</span>
                    <strong>$ {totales.remunerativos.toFixed(2)}</strong>
                </div>
                <div className="total-fila">
                    <span>No Remunerativos:</span>
                    <strong>$ {totales.noRemunerativos.toFixed(2)}</strong>
                </div>
                <div className="total-fila">
                    <span>Descuentos:</span>
                    <strong>-$ {totales.descuentos.toFixed(2)}</strong>
                </div>
                {totales.informativos > 0 && (
                    <div className="total-fila">
                        <span>Costos Empleador (Informativos):</span>
                        <strong>$ {totales.informativos.toFixed(2)}</strong>
                    </div>
                )}
                <div className="total-fila total-neto">
                    <span>NETO A COBRAR:</span>
                    <strong>$ {totales.neto.toFixed(2)}</strong>
                </div>
            </div>

            {liquidacion.estado === 'BORRADOR' && (
                <div className="acciones-liq">
                    <button className="btn-secundario" onClick={handleImprimirRecibo}>
                        Vista Previa del Recibo
                    </button>
                    <button className="btn-secundario" onClick={() => setMostrarModalCopiar(true)}>
                        Copiar Configuración
                    </button>
                    <button className="btn-secundario" onClick={guardarBorrador}>
                        Guardar Borrador
                    </button>
                    <button className="btn-primario" onClick={handleFinalizar}>
                        Finalizar Liquidación
                    </button>
                </div>
            )}
            {liquidacion.estado === 'FINALIZADA' && (
                <div className="acciones-liq">
                    {liquidacion.estado === 'FINALIZADA' && (
                        <button className="btn-peligro" onClick={async () => {
                            if (window.confirm('¿Reabrir esta liquidación? Volverá a ser un borrador editable.')) {
                                await api.put(`/liquidaciones/${id}/reabrir`);
                                cargarLiquidacion();
                            }
                        }}>
                            🔓 Reabrir Liquidación
                        </button>
                    )}
                    <button className="btn-primario" onClick={handleImprimirRecibo}>
                        🖨️ Ver / Imprimir Recibo (PDF)
                    </button>
                </div>
            )}

            {mostrarModalCopiar && (
                <ModalCopiar
                    liquidacionActualId={id}
                    onClose={() => setMostrarModalCopiar(false)}
                    onExito={() => {
                        setMostrarModalCopiar(false);
                        cargarLiquidacion();
                    }}
                />
            )}
            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                <ReciboPrint ref={reciboRef} data={datosRecibo} />
            </div>
        </div>
    );
}