import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Categorias() {
    const [categorias, setCategorias] = useState([]);
    const [nombre, setNombre] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        cargarCategorias();
    }, []);

    const cargarCategorias = async () => {
        try {
            const res = await api.get('/categorias');
            setCategorias(res.data);
        } catch (error) {
            console.error('Error al cargar categorías', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (editandoId) {
                await api.put(`/categorias/${editandoId}`, { nombre });
            } else {
                await api.post('/categorias', { nombre });
            }
            setNombre('');
            setEditandoId(null);
            cargarCategorias();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar la categoría');
        }
    };

    const handleEditar = (cat) => {
        setEditandoId(cat.id);
        setNombre(cat.nombre);
    };

    const handleCancelar = () => {
        setEditandoId(null);
        setNombre('');
        setError(null);
    };

    const handleBaja = async (id, nombreCat) => {
        if (!window.confirm(`¿Estás seguro de dar de baja la categoría "${nombreCat}"?`)) return;
        try {
            await api.delete(`/categorias/${id}`);
            cargarCategorias();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al dar de baja');
        }
    };
    const handleReactivar = async (id, nombreCat) => {
        if (!window.confirm(`¿Reactivar la categoría "${nombreCat}"?`)) return;
        try {
            await api.put(`/categorias/${id}/reactivar`);
            cargarCategorias();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al reactivar');
        }
    };

    const activas = categorias.filter(c => !c.eliminado);
    const inactivas = categorias.filter(c => c.eliminado);

    return (
        <div className="vista-principal">
            <header className="cabecera-acciones">
                <h2>Gestión de Categorías para Gráficos</h2>
            </header>

            <div className="formulario-contenedor" style={{ marginBottom: '30px', maxWidth: '100%' }}>
                <h3>{editandoId ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                        <label>Nombre de la Categoría</label>
                        <input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Seguridad Social" />
                    </div>
                    <button type="submit" className="btn-guardar">{editandoId ? 'Actualizar' : 'Guardar'}</button>
                    {editandoId && <button type="button" className="btn-cancelar" onClick={handleCancelar}>Cancelar</button>}
                </form>
            </div>

            <table className="tabla-datos">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {activas.map(cat => (
                        <tr key={cat.id}>
                            <td><strong>{cat.nombre}</strong></td>
                            <td><span className="estado-badge finalizada">Activa</span></td>
                            <td>
                                <button className="btn-accion" style={{ marginRight: '10px' }} onClick={() => handleEditar(cat)}>Editar</button>
                                <button className="btn-peligro" onClick={() => handleBaja(cat.id, cat.nombre)}>Baja</button>
                            </td>
                        </tr>
                    ))}
                    {inactivas.map(cat => (
                        <tr key={cat.id} className="item-inactivo">
                            <td>{cat.nombre}</td>
                            <td><span className="estado-badge borrador">Baja</span></td>
                            <td>
                                <button className="btn-secundario" onClick={() => handleReactivar(cat.id, cat.nombre)}>
                                    Reactivar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}