import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import api from '../services/api';

export default function Items() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        cargarItems();
    }, []);

    const cargarItems = async () => {
        try {
            const res = await api.get('/items');
            setItems(res.data);
        } catch (error) {
            console.error('Error al cargar items', error);
        }
    };

    const eliminarItem = async (id) => {
        if (!window.confirm('¿Eliminar este item?')) return;
        try {
            await api.delete(`/items/${id}`);
            cargarItems();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al eliminar');
        }
    };

    return (
        <div className="vista-principal">
            <header className="cabecera-acciones">
                <h2>Items Globales de Liquidación</h2>
                <Link to="/item/nuevo"><button className="btn-primario">+ Nuevo Item</button></Link>
            </header>
            <table className="tabla-datos">
                <thead>
                    <tr>
                        <th>Token</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Naturaleza</th>
                        <th>Detalle</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id}>
                            <td><strong>{item.token}</strong></td>
                            <td>{item.nombre}</td>
                            <td>{item.tipo}</td>
                            <td>{item.naturaleza}</td>
                            <td>
                                {item.tipo === 'PORCENTAJE' && item.base_token && (
                                    <small className="token-hint">{item.porcentaje}% de {item.base_token}</small>
                                )}
                                {item.tipo === 'FORMULA' && (
                                    <small className="token-hint">{item.formula}</small>
                                )}
                            </td>
                            <td>
                                <button className="btn-peligro" onClick={() => eliminarItem(item.id)}>Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}