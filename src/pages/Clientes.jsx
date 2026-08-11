import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import api from '../services/api';

export default function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [expandidos, setExpandidos] = useState({});

    useEffect(() => {
        cargarClientes();
    }, []);

    const cargarClientes = async () => {
        try {
            const res = await api.get('/entidades/clientes');
            setClientes(res.data);
        } catch (error) {
            console.error('Error al cargar clientes', error);
        }
    };

    const toggleExpand = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="vista-principal">
            <header className="cabecera-acciones">
                <h2>Directorio de Clientes</h2>
                <Link to="/cliente/nuevo"><button className="btn-primario">+ Nuevo Cliente</button></Link>
            </header>

            <div className="lista-carpetas">
                {clientes.map(cliente => (
                    <div key={cliente.id} className="carpeta">
                        <div className="carpeta-header" onClick={() => toggleExpand(cliente.id)}>
                            <span className="icono">{expandidos[cliente.id] ? '📂' : '📁'}</span>
                            <span className="titulo-carpeta">{cliente.razon_social}</span>
                            <span className="cuit-carpeta">CUIT: {cliente.cuit}</span>
                        </div>

                        {expandidos[cliente.id] && (
                            <div className="carpeta-contenido">
                                <div className="acciones-internas">
                                    <Link to={`/empleado/nuevo/${cliente.id}`}>
                                        <button className="btn-secundario">+ Agregar Empleado</button>
                                    </Link>
                                </div>
                                
                                {cliente.empleados.length === 0 ? (
                                    <p className="texto-vacio">No hay empleados registrados para este cliente.</p>
                                ) : (
                                    <table className="tabla-datos">
                                        <thead>
                                            <tr>
                                                <th>Legajo</th>
                                                <th>Nombre Completo</th>
                                                <th>CUIL</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cliente.empleados.map(emp => (
                                                <tr key={emp.id}>
                                                    <td>{emp.nro_legajo}</td>
                                                    <td>{emp.apellido}, {emp.nombre}</td>
                                                    <td>{emp.cuil}</td>
                                                    <td>
                                                        <Link to={`/empleado/${emp.id}`}>
                                                            <button className="btn-accion">Administrar</button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}