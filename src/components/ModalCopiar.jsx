import { useState } from 'react';
import api from '../services/api';

export default function ModalCopiar({ liquidacionActualId, onClose, onExito }) {
    const [empleadoIdBuscado, setEmpleadoIdBuscado] = useState('');
    const [liquidacionesDisponibles, setLiquidacionesDisponibles] = useState([]);

    // Busca las liquidaciones finalizadas (o borradores anteriores) de un empleado
    const buscarLiquidaciones = async () => {
        try {
            // Asumiendo que crearás un endpoint simple para listar liquidaciones de un empleado
            const res = await api.get(`/entidades/empleados/${empleadoIdBuscado}/liquidaciones`);
            setLiquidacionesDisponibles(res.data.filter(l => l.id !== parseInt(liquidacionActualId)));
        } catch (error) {
            alert('Error al buscar liquidaciones del empleado.');
        }
    };

    const aplicarCopia = async (origenId) => {
        if (!window.confirm('Esto sobrescribirá el estado activo/inactivo y los porcentajes actuales. ¿Continuar?')) return;
        
        try {
            await api.post(`/liquidaciones/${liquidacionActualId}/copiar`, {
                liquidacion_origen_id: origenId
            });
            onExito(); // Refresca la vista principal
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
                    <label>ID del Empleado Origen (puede ser de otro cliente)</label>
                    <div className="input-grupo">
                        <input 
                            type="number" 
                            value={empleadoIdBuscado} 
                            onChange={e => setEmpleadoIdBuscado(e.target.value)} 
                            placeholder="Ingrese el ID"
                        />
                        <button className="btn-secundario" onClick={buscarLiquidaciones}>Buscar</button>
                    </div>
                </div>

                {liquidacionesDisponibles.length > 0 && (
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
                )}

                <button className="btn-cancelar mt-2" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    );
}