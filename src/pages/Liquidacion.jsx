import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';
import { redondear, calcularFormula } from '../utils/mathEngine';
import ModalCopiar from '../components/ModalCopiar';

export default function Liquidacion({ params }) {
    const [mostrarModalCopiar, setMostrarModalCopiar] = useState(false);
    const { id } = params;
    const [liquidacion, setLiquidacion] = useState(null);
    const [items, setItems] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [valoresCalculados, setValoresCalculados] = useState({});
    const [, setLocation] = useLocation();

    useEffect(() => {
        cargarLiquidacion();
    }, [id]);

    const manejarGeneracionPDF = async () => {
        try {
            const response = await api.get(`/liquidaciones/${id}/pdf`, {
                responseType: 'blob' // Fundamental para recibir el PDF
            });

            // Crear una URL temporal para el blob y abrirlo en una nueva pestaña
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');

        } catch (error) {
            alert('Error al generar el documento PDF.');
        }
    };
    const handleFinalizar = async () => {
        if (!window.confirm('¿Está seguro de finalizar? La liquidación quedará congelada y no podrá modificarse.')) return;

        try {
            // Guardamos el borrador por última vez para asegurar cálculos finales
            await guardarBorrador();

            await api.put(`/liquidaciones/${id}/finalizar`);
            alert('Liquidación finalizada correctamente.');
            cargarLiquidacion(); // Recarga para actualizar el estado a FINALIZADA y bloquear inputs
        } catch (error) {
            alert(error.response?.data?.error || 'Error al finalizar.');
        }
    };

    const cargarLiquidacion = async () => {
        try {
            const res = await api.get(`/liquidaciones/${id}`);
            setLiquidacion(res.data);
            setItems(res.data.items);
            setCategorias(res.data.categorias);
            recalcular(res.data.items);
        } catch (error) {
            console.error('Error al cargar liquidación', error);
        }
    };

    const recalcular = (itemsActuales) => {
        const contexto = {};
        const resultados = {};
        let itemsPendientes = [...itemsActuales];

        // Límite de iteraciones de seguridad (evita bucles infinitos si hay un error no detectado)
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
                    const val = parseFloat(item.valor_ingresado) || 0;
                    contexto[item.token] = val;
                    resultados[item.id] = val;
                } else if (item.tipo === 'PORCENTAJE') {
                    // El porcentaje por sí solo no representa el monto en plata, suele requerir base.
                    // Si el porcentaje ES el valor, se pasa directo. 
                    const val = parseFloat(item.porcentaje) || 0;
                    contexto[item.token] = val;
                    resultados[item.id] = val;
                } else if (item.tipo === 'FORMULA') {
                    // Validar si tenemos todos los tokens que necesita esta fórmula
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

    const guardarBorrador = async () => {
        try {
            await api.put(`/liquidaciones/${id}/borrador`, {
                items,
                resultados: valoresCalculados
            });
            alert('Borrador guardado correctamente.');
        } catch (error) {
            alert('Error al guardar el borrador.');
        }
    };

    if (!liquidacion) return <div>Cargando...</div>;

    return (
        <div className="liquidacion-contenedor">
            <header className="liq-header">
                <h2>Liquidación: {liquidacion.mes}/{liquidacion.anio}</h2>
                <span className={`estado-badge ${liquidacion.estado.toLowerCase()}`}>{liquidacion.estado}</span>
            </header>

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
                    {items.map(item => (
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
                    <button className="btn-primario" onClick={manejarGeneracionPDF}>
                        🖨️ Ver / Imprimir Recibo
                    </button>
                </div>
            )}

            {mostrarModalCopiar && (
                <ModalCopiar
                    liquidacionActualId={id}
                    onClose={() => setMostrarModalCopiar(false)}
                    onExito={() => {
                        setMostrarModalCopiar(false);
                        cargarLiquidacion(); // Recarga los datos actualizados
                    }}
                />
            )}
        </div>
    );
}