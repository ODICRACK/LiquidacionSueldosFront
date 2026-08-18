import { useState, useEffect } from 'react';
import api from '../services/api';

export default function ModalCopiar({ liquidacionActualId, onClose, onExito }) {
    const [clientes, setClientes] = useState([]);
    const [clienteId, setClienteId] = useState('');
    const [empleadoId, setEmpleadoId] = useState('');

    useEffect(() => {
        api.get('/entidades/clientes')
            .then(res => setClientes(res.data))
            .catch(() => alert('Error al cargar los clientes.'));
    }, []);

    const empleados = clienteId
        ? (clientes.find(c => c.id === parseInt(clienteId))?.empleados || [])
        : [];

    const empleadoSeleccionado = empleados.find(e => e.id === parseInt(empleadoId));

    // Liquidaciones del empleado seleccionado (excluyendo la actual), la más reciente primero
    const liquidacionesDisponibles = (empleadoSeleccionado?.liquidaciones || [])
        .filter(l => l.id !== parseInt(liquidacionActualId))
        .sort((a, b) => b.anio - a.anio || b.mes - a.mes);

    const ultima = liquidacionesDisponibles[0] || null;

    const aplicarCopia = async (origenId) => {
        if (!window.confirm('Esto sobrescribirá el estado activo/inactivo y los porcentajes actuales. ¿Continuar?')) return;

        try {
            await api.post(`/liquidaciones/${liquidacionActualId}/copiar`, {
                liquidacion_origen_id: origenId
            });
            onExito();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al copiar la configuración');
        }
    };

    return (
        <div className="mc-overlay">
            <div className="mc-dialog">
                
                {/* Cabecera */}
                <div className="mc-header">
                    <h3 className="mc-title">Copiar Configuración</h3>
                    <p className="mc-subtitle">
                        Se clonarán los estados (Activo/Inactivo) y los porcentajes. <strong>No copiará valores manuales.</strong>
                    </p>
                </div>

                {/* Cuerpo scrollable */}
                <div className="mc-body">
                    <div className="mc-field">
                        <label className="mc-label">Cliente</label>
                        <select
                            className="mc-select"
                            value={clienteId}
                            onChange={e => { setClienteId(e.target.value); setEmpleadoId(''); }}
                        >
                            <option value="">Seleccione un cliente</option>
                            {clientes.map(c => (
                                <option key={c.id} value={c.id}>{c.razon_social} (CUIT {c.cuit})</option>
                            ))}
                        </select>
                    </div>

                    <div className="mc-field">
                        <label className="mc-label">Empleado</label>
                        <select
                            className="mc-select"
                            value={empleadoId}
                            onChange={e => setEmpleadoId(e.target.value)}
                            disabled={!clienteId}
                        >
                            <option value="">Seleccione un empleado</option>
                            {empleados.map(e => (
                                <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {empleadoSeleccionado && (
                        ultima ? (
                            <div className="mc-featured-card">
                                <p className="mc-featured-text">
                                    Se copiará de la <strong>última liquidación</strong> de {empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}:
                                    <strong> {ultima.mes}/{ultima.anio}</strong> ({ultima.estado}).
                                </p>
                                <button className="mc-btn mc-btn-primary" onClick={() => aplicarCopia(ultima.id)}>
                                    Copiar esta configuración
                                </button>
                            </div>
                        ) : (
                            <p className="mc-subtitle" style={{ marginTop: '20px', fontStyle: 'italic' }}>
                                Este empleado no tiene liquidaciones anteriores para copiar.
                            </p>
                        )
                    )}

                    {liquidacionesDisponibles.length > 1 && (
                        <div className="mc-history-section">
                            <h4 className="mc-history-title">O selecciona un período anterior:</h4>
                            <div className="mc-table-wrapper">
                                <table className="mc-table">
                                    <thead>
                                        <tr>
                                            <th>Período</th>
                                            <th>Estado</th>
                                            <th style={{ textAlign: 'right' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {liquidacionesDisponibles.map(liq => (
                                            <tr key={liq.id}>
                                                <td><strong>{liq.mes}/{liq.anio}</strong></td>
                                                <td>{liq.estado}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="mc-btn mc-btn-outline" onClick={() => aplicarCopia(liq.id)}>
                                                        Usar esta
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pie del modal */}
                <div className="mc-footer">
                    <button className="mc-btn mc-btn-cancel" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
                
            </div>
        </div>
    );
}