import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export default function ClienteForm({ params }) {
    const id = params?.id;
    const [form, setForm] = useState({ cuit: '', razon_social: '', domicilio_laboral: '' });
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (id) {
            api.get(`/entidades/clientes/${id}`)
               .then(res => setForm(res.data))
               .catch(() => alert('Error al cargar datos del cliente'));
        }
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (id) {
                await api.put(`/entidades/clientes/${id}`, form);
            } else {
                await api.post('/entidades/clientes', form);
            }
            setLocation('/clientes');
        } catch (error) {
            alert(error.response?.data?.error || 'Error al guardar el cliente');
        }
    };

    return (
        <div className="formulario-contenedor">
            <h2>{id ? 'Editar Cliente' : 'Alta de Cliente'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Razón Social</label>
                    <input 
                        required 
                        value={form.razon_social} 
                        onChange={e => setForm({...form, razon_social: e.target.value})} 
                        placeholder="Ej: Don Mariano Constructora S.R.L."
                    />
                </div>
                <div className="form-group">
                    <label>CUIT</label>
                    <input 
                        required 
                        value={form.cuit} 
                        onChange={e => setForm({...form, cuit: e.target.value})} 
                        placeholder="Sin guiones"
                    />
                </div>
                <div className="form-group">
                    <label>Domicilio Laboral</label>
                    <input 
                        value={form.domicilio_laboral || ''} 
                        onChange={e => setForm({...form, domicilio_laboral: e.target.value})} 
                        placeholder="Ej: Ushuaia, Tierra del Fuego" 
                    />
                </div>
                <div className="acciones-form">
                    <button type="button" onClick={() => setLocation('/clientes')} className="btn-cancelar">Cancelar</button>
                    <button type="submit" className="btn-guardar">{id ? 'Actualizar Cliente' : 'Guardar Cliente'}</button>
                </div>
            </form>
        </div>
    );
}