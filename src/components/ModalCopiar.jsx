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
        <div className="modal-overlay">
            <div className="modal-contenido">
                <h3>Copiar Configuración</h3>
                <p>La configuración copiará estados (Activo/Inactivo) y Porcentajes. <strong>No copiará valores manuales.</strong></p>

                <div className="form-group">
                    <label>Cliente</label>
                    <select
                        value={clienteId}
                        onChange={e => { setClienteId(e.target.value); setEmpleadoId(''); }}
                    >
                        <option value="">Seleccione un cliente</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.razon_social} (CUIT {c.cuit})</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Empleado</label>
                    <select
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
                        <div className="aviso-copia">
                            <p>
                                Se copiará de la <strong>última liquidación</strong> de {empleadoSeleccionado.apellido}, {empleadoSeleccionado.nombre}:
                                <strong> {ultima.mes}/{ultima.anio}</strong> ({ultima.estado}).
                            </p>
                            <button className="btn-primario" onClick={() => aplicarCopia(ultima.id)}>Copiar configuración</button>
                        </div>
                    ) : (
                        <p>Este empleado no tiene liquidaciones anteriores para copiar.</p>
                    )
                )}

                {liquidacionesDisponibles.length > 1 && (
                    <>
                        <p className="mt-2">O elegí otra liquidación:</p>
                        <table className="tabla-datos">
                            <thead>
                                <tr>
                                    <th>Período</th>
                                    <th>Estado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {liquidacionesDisponibles.map(liq => (
                                    <tr key={liq.id}>
                                        <td>{liq.mes}/{liq.anio}</td>
                                        <td>{liq.estado}</td>
                                        <td>
                                            <button className="btn-accion" onClick={() => aplicarCopia(liq.id)}>Usar esta</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                <button className="btn-cancelar mt-2" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    );
}
