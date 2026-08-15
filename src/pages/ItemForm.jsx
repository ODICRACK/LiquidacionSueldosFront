import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export default function ItemForm({ params }) {
    const id = params?.id;
    const [form, setForm] = useState({
        nombre: '', token: '', tipo: 'PORCENTAJE', naturaleza: 'SUMA', formula: '', porcentaje: '', base_token: '',
        unidad_imprimible: '', base_imprimible: '' // <-- NUEVOS CAMPOS
    });
    const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]); 
    const [itemsDisponibles, setItemsDisponibles] = useState([]);
    const [error, setError] = useState(null);
    const [, setLocation] = useLocation();

    useEffect(() => {
        api.get('/categorias').then(res => setCategoriasDisponibles(res.data.filter(c => !c.eliminado))).catch(console.error);
        api.get('/items').then(res => setItemsDisponibles(res.data)).catch(console.error);

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
                    base_token: data.base_token || '',
                    unidad_imprimible: data.unidad_imprimible || '',
                    base_imprimible: data.base_imprimible || ''
                });
                
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
                        disabled={id && form.token === 'SB'} 
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
                            <option value="NO_REMUNERATIVO">Suma (No Remunerativo)</option> {/* NUEVA OPCIÓN */}
                            <option value="RESTA">Resta (Descuento)</option>
                            <option value="INFORMATIVO">Informativo</option>
                            <option value="AUXILIAR">Auxiliar (Solo para fórmulas)</option>
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
                    </>
                )}

                {form.tipo === 'FORMULA' && (
                    <div className="form-group">
                        <label>Fórmula Matemática (use Tokens)</label>
                        <input value={form.formula} onChange={e => setForm({...form, formula: e.target.value.toUpperCase()})} required placeholder="Ej: SB / 30 * DT" />
                        <small>Operadores permitidos: + - * / % ( )</small>
                    </div>
                )}

                {/* NUEVA SECCIÓN: CONFIGURACIÓN VISUAL PDF */}
                <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#1a3b8a' }}>Configuración Visual para el PDF</h4>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                        Escribe exactamente qué quieres que se muestre en las columnas del recibo. Puedes usar texto fijo (Ej: "30") o llamar a un Token para que muestre su valor (Ej: "DIAS_TRAB").
                    </p>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Columna "UNIDAD"</label>
                            <input 
                                value={form.unidad_imprimible} 
                                onChange={e => setForm({...form, unidad_imprimible: e.target.value})} 
                                placeholder="Ej: 11% , 30 , o token DIAS_TRAB" 
                            />
                        </div>
                        <div className="form-group">
                            <label>Columna "BASE"</label>
                            <input 
                                value={form.base_imprimible} 
                                onChange={e => setForm({...form, base_imprimible: e.target.value})} 
                                placeholder="Ej: token SBRUTO" 
                            />
                        </div>
                    </div>
                </div>

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