import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export default function EmpleadoForm({ params }) {
    const { cliente_id, id } = params;
    const [form, setForm] = useState({ 
        cuil: '', nombre: '', apellido: '', nro_legajo: '', fecha_ingreso: '', 
        cliente_id: cliente_id || '', sueldo_basico: '',
        categoria_laboral: '', banco: '' // <-- NUEVOS CAMPOS
    });
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (id) {
            api.get(`/entidades/empleados/${id}`)
               .then(res => {
                   const data = res.data;
                   if (data.fecha_ingreso) data.fecha_ingreso = data.fecha_ingreso.split('T')[0];
                   setForm({
                       ...data,
                       categoria_laboral: data.categoria_laboral || '',
                       banco: data.banco || ''
                   });
               })
               .catch(() => alert('Error al cargar datos del empleado'));
        }
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (id) {
                await api.put(`/entidades/empleados/${id}`, form);
            } else {
                await api.post('/entidades/empleados', form);
            }
            setLocation('/clientes');
        } catch (error) {
            alert(error.response?.data?.error || 'Error al guardar el empleado');
        }
    };

    return (
        <div className="formulario-contenedor">
            <h2>{id ? 'Editar Empleado' : 'Alta de Empleado'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Nombre</label>
                    <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>Apellido</label>
                    <input required value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} />
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label>CUIL (sin guiones)</label>
                        <input required value={form.cuil} onChange={e => setForm({...form, cuil: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>N° Legajo</label>
                        <input value={form.nro_legajo || ''} onChange={e => setForm({...form, nro_legajo: e.target.value})} />
                    </div>
                </div>

                {/* NUEVA FILA: CATEGORÍA Y BANCO */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Categoría Laboral</label>
                        <input 
                            value={form.categoria_laboral} 
                            onChange={e => setForm({...form, categoria_laboral: e.target.value})} 
                            placeholder="Ej: Administrativo A" 
                        />
                    </div>
                    <div className="form-group">
                        <label>Banco</label>
                        <input 
                            value={form.banco} 
                            onChange={e => setForm({...form, banco: e.target.value})} 
                            placeholder="Ej: BNA, Galicia, etc." 
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Fecha de Ingreso</label>
                        <input type="date" value={form.fecha_ingreso || ''} onChange={e => setForm({...form, fecha_ingreso: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Sueldo Básico</label>
                        <input
                            type="number" step="0.01" min="0" required
                            value={form.sueldo_basico}
                            onChange={e => setForm({...form, sueldo_basico: e.target.value})}
                            placeholder="0.00"
                        />
                    </div>
                </div>
                
                <div className="acciones-form">
                    <button type="button" onClick={() => setLocation('/clientes')} className="btn-cancelar">Cancelar</button>
                    <button type="submit" className="btn-guardar">{id ? 'Actualizar Empleado' : 'Guardar Empleado'}</button>
                </div>
            </form>
        </div>
    );
}