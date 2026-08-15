import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export default function ItemForm({ params }) {
    const id = params?.id;
    const [form, setForm] = useState({
        nombre: '', token: '', tipo: 'PORCENTAJE', naturaleza: 'SUMA', formula: '', porcentaje: '', base_token: ''
    });
    const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]); // [{ id, operacion }]
    const [itemsDisponibles, setItemsDisponibles] = useState([]);
    const [error, setError] = useState(null);
    const [, setLocation] = useLocation();

    useEffect(() => {
        // Cargar combos
        api.get('/categorias').then(res => setCategoriasDisponibles(res.data.filter(c => !c.eliminado))).catch(console.error);
        api.get('/items').then(res => setItemsDisponibles(res.data)).catch(console.error);

        // Si hay ID, cargar datos del item a editar
        if (id) {
            api.get(`/items/${id}`).then(res => {
                const data = res.data;
                setForm({
                    nombre: data.nombre,
                    token: data.token,
                    tipo: data.tipo,
                    naturaleza: data.naturaleza,
                    formula: data.formula || '',
                    porcentaje: data.porcentaje || '',
                    base_token: data.base_token || ''
                });
                
                // Mapear categorías del formato de BD al del state
                if (data.categorias) {
                    setCategoriasSeleccionadas(data.categorias.map(c => ({
                        id: c.categoria_id,
                        operacion: c.operacion
                    })));
                }
            }).catch(() => alert('Error al cargar el item'));
        }
    }, [id]);

    const handleCategoriaToggle = (catId) => {
        const existe = categoriasSeleccionadas.find(c => c.id === catId);
        if (existe) {
            setCategoriasSeleccionadas(categoriasSeleccionadas.filter(c => c.id !== catId));
        } else {
            setCategoriasSeleccionadas([...categoriasSeleccionadas, { id: catId, operacion: 'SUMA' }]);
        }
    };

    const handleOperacionChange = (catId, operacion) => {
        setCategoriasSeleccionadas(categoriasSeleccionadas.map(c => 
            c.id === catId ? { ...c, operacion } : c
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const payload = { ...form, token: form.token.toUpperCase(), categorias: categoriasSeleccionadas };
            
            if (payload.tipo !== 'PORCENTAJE') {
                payload.porcentaje = null;
                payload.base_token = null;
            }
            if (payload.tipo !== 'FORMULA') payload.formula = null;

            if (id) {
                await api.put(`/items/${id}`, payload);
            } else {
                await api.post('/items', payload);
            }
            setLocation('/items');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el item');
        }
    };

    return (
        <div className="formulario-contenedor">
            <h2>{id ? 'Editar Item' : 'Configuración de Item'}</h2>
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Nombre del Concepto</label>
                    <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                </div>
                
                <div className="form-group">
                    <label>Token Único (ej: JUB, SB)</label>
                    <input 
                        required 
                        value={form.token} 
                        onChange={e => setForm({...form, token: e.target.value.toUpperCase()})}
                        disabled={id && form.token === 'SB'} // Bloquear si es el Sueldo Básico
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Tipo</label>
                        <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                            <option value="PORCENTAJE">Porcentaje</option>
                            <option value="FORMULA">Fórmula</option>
                            <option value="MANUAL">Manual</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Naturaleza (Total)</label>
                        <select value={form.naturaleza} onChange={e => setForm({...form, naturaleza: e.target.value})}>
                            <option value="SUMA">Suma (Remunerativo)</option>
                            <option value="RESTA">Resta (Descuento)</option>
                            <option value="INFORMATIVO">Informativo</option>
                            <option value="AUXILIAR">Auxiliar (Solo para fórmulas, no imprime)</option>
                        </select>
                    </div>
                </div>

                {form.tipo === 'PORCENTAJE' && (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Porcentaje Predeterminado (%)</label>
                                <input type="number" step="0.01" value={form.porcentaje} onChange={e => setForm({...form, porcentaje: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Item Base (se calcula sobre el valor de este token)</label>
                                <select value={form.base_token} onChange={e => setForm({...form, base_token: e.target.value})} required>
                                    <option value="">— Seleccionar base —</option>
                                    {itemsDisponibles
                                        .filter(i => i.token !== form.token.toUpperCase())
                                        .map(i => (
                                            <option key={i.id} value={i.token}>
                                                {i.token} — {i.nombre}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                        <small>Ej: "Jubilación" con 11% de BR → resultado = BR × 11 / 100</small>
                    </>
                )}

                {form.tipo === 'FORMULA' && (
                    <div className="form-group">
                        <label>Fórmula Matemática (use Tokens)</label>
                        <input value={form.formula} onChange={e => setForm({...form, formula: e.target.value.toUpperCase()})} required placeholder="Ej: SB / 30 * DT" />
                        <small>Operadores permitidos: + - * / % ( )</small>
                    </div>
                )}

                <div className="form-group" style={{ marginTop: '20px' }}>
                    <label>Asignación a Categorías (Gráfico)</label>
                    <div className="categorias-lista">
                        {categoriasDisponibles.map(cat => {
                            const seleccionada = categoriasSeleccionadas.find(c => c.id === cat.id);
                            return (
                                <div key={cat.id} className="categoria-item" style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <label>
                                        <input type="checkbox" checked={!!seleccionada} onChange={() => handleCategoriaToggle(cat.id)} />
                                        {' '}{cat.nombre}
                                    </label>
                                    {seleccionada && (
                                        <select value={seleccionada.operacion} onChange={e => handleOperacionChange(cat.id, e.target.value)} style={{ padding: '2px', fontSize: '0.85rem' }}>
                                            <option value="SUMA">Suma a categoría</option>
                                            <option value="RESTA">Resta a categoría</option>
                                        </select>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="acciones-form">
                    <button type="button" onClick={() => setLocation('/items')} className="btn-cancelar">Cancelar</button>
                    <button type="submit" className="btn-guardar">{id ? 'Actualizar Item' : 'Guardar Item'}</button>
                </div>
            </form>
        </div>
    );
}