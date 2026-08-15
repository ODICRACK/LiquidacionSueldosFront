import { useState, useEffect, useRef } from 'react';
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
            setLiquidacion(res.data);
            setItems(res.data.items);
            recalcular(res.data.items);
        } catch (error) {
            console.error('Error al cargar liquidación', error);
        }
    };

    const recalcular = (itemsActuales) => {
        const contexto = {};
        const resultados = {};
        let itemsPendientes = [...itemsActuales];

        let iteraciones = 0;
        const MAX_ITERACIONES = itemsActuales.length * 2;

        while (itemsPendientes.length > 0 && iteraciones < MAX_ITERACIONES) {
            const faltantes = [];

            for (const item of itemsPendientes) {
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
                    const tokensNecesarios = item.formula.match(/[A-Z]+/g) || [];
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
            itemsPendientes = faltantes;
            iteraciones++;
        }

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

    // --- CÁLCULO DE TOTALES ACTUALIZADO ---
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
                    {items.filter(i => i.token !== 'SB').map(item => (
                        <tr key={item.id} className={!item.activo ? 'item-inactivo' : ''}>
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
                                <small className="token-hint"> ({item.token})</small>
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
                                    />
                                )}
                                {item.tipo === 'PORCENTAJE' && (
                                    <div className="input-grupo">
                                        <input
                                            type="number" step="0.01"
                                            value={item.porcentaje || ''}
                                            disabled={!item.activo || liquidacion.estado === 'FINALIZADA'}
                                            onChange={(e) => handleItemChange(item.id, 'porcentaje', e.target.value)}
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