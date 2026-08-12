import { useState } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export default function ClienteForm() {
    const [form, setForm] = useState({ cuit: '', razon_social: '', domicilio_laboral: '' });
    const [, setLocation] = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/entidades/clientes', form);
            setLocation('/clientes');
        } catch {
            alert('Error al guardar el cliente');
        }
    };

    return (
        <div className="formulario-contenedor">
            <h2>Alta de Cliente</h2>
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
                        value={form.domicilio_laboral} 
                        onChange={e => setForm({...form, domicilio_laboral: e.target.value})} 
                        placeholder="Ej: Ushuaia, Tierra del Fuego" 
                    />
                </div>
                <div className="acciones-form">
                    <button type="button" onClick={() => setLocation('/clientes')} className="btn-cancelar">Cancelar</button>
                    <button type="submit" className="btn-guardar">Guardar Cliente</button>
                </div>
            </form>
        </div>
    );
}