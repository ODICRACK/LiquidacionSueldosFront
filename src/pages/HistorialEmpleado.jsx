import { useState } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export default function HistorialEmpleado({ params }) {
    const { empleado_id } = params;
    const [, setLocation] = useLocation();
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
    const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

    const manejarAperturaLiquidacion = async () => {
        try {
            // Intentamos crear. Si ya existe, el backend devuelve el ID existente (status 409).
            const payload = { empleado_id, anio: anioSeleccionado, mes: mesSeleccionado };
            const res = await api.post('/liquidaciones', payload);
            
            // Navegar a la vista de liquidación con el ID generado
            setLocation(`/liquidacion/${res.data.liquidacion_id}`);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                // Ya existe: la abrimos utilizando el ID devuelto por el backend
                setLocation(`/liquidacion/${error.response.data.liquidacion_id}`);
            } else {
                alert('Error al gestionar la liquidación.');
            }
        }
    };

    return (
        <div className="historial-contenedor">
            <h2>Selección de Período</h2>
            <div className="form-row">
                <div className="form-group">
                    <label>Año</label>
                    <input 
                        type="number" 
                        value={anioSeleccionado} 
                        onChange={e => setAnioSeleccionado(parseInt(e.target.value))} 
                    />
                </div>
                <div className="form-group">
                    <label>Mes</label>
                    <select value={mesSeleccionado} onChange={e => setMesSeleccionado(parseInt(e.target.value))}>
                        <option value={1}>Enero</option>
                        <option value={2}>Febrero</option>
                        <option value={3}>Marzo</option>
                        {/* ... completar meses ... */}
                        <option value={12}>Diciembre</option>
                    </select>
                </div>
            </div>
            <button className="btn-primario" onClick={manejarAperturaLiquidacion}>
                Abrir / Crear Liquidación
            </button>
        </div>
    );
}