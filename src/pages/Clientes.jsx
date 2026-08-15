import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import api from '../services/api';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth() + 1;

const calcularProgreso = (cliente) => {
    // Solo contamos a los empleados activos para el progreso
    const empleadosActivos = cliente.empleados.filter(e => !e.eliminado);
    const total = empleadosActivos.length;
    const hechas = empleadosActivos.filter(emp =>
        (emp.liquidaciones || []).some(l => l.anio === ANIO_ACTUAL && l.mes === MES_ACTUAL && l.estado === 'FINALIZADA')
    ).length;

    const proporcion = total > 0 ? hechas / total : 0;
    let clase = 'neutro';
    if (total === 0) clase = 'neutro';
    else if (proporcion > 2 / 3) clase = 'verde';
    else if (proporcion >= 1 / 3) clase = 'amarillo';
    else clase = 'rojo';

    return { hechas, total, clase };
};

const generarAnios = (empleado) => {
    const anioIngreso = empleado.fecha_ingreso
        ? new Date(empleado.fecha_ingreso).getFullYear()
        : ANIO_ACTUAL - 3;
    const anios = [];
    for (let y = ANIO_ACTUAL; y >= Math.min(anioIngreso, ANIO_ACTUAL); y--) anios.push(y);
    return anios;
};

export default function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [expandidos, setExpandidos] = useState({});
    const [empleadosExpandidos, setEmpleadosExpandidos] = useState({});
    const [aniosExpandidos, setAniosExpandidos] = useState({});
    const [, setLocation] = useLocation();

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

    const handleBajaCliente = async (id, razonSocial) => {
        if (!window.confirm(`¿Estás seguro de dar de baja al cliente "${razonSocial}" y a TODOS sus empleados?`)) return;
        try {
            await api.delete(`/entidades/clientes/${id}`);
            cargarClientes();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al dar de baja el cliente.');
        }
    };

    const handleBajaEmpleado = async (id, nombreCompleto) => {
        if (!window.confirm(`¿Estás seguro de dar de baja al empleado ${nombreCompleto}?`)) return;
        try {
            await api.delete(`/entidades/empleados/${id}`);
            cargarClientes();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al dar de baja el empleado.');
        }
    };

    const toggleExpand = (id) => setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleEmpleado = (empleadoId) => setEmpleadosExpandidos(prev => ({ ...prev, [empleadoId]: !prev[empleadoId] }));
    
    const toggleAnio = (empleadoId, anio) => {
        setAniosExpandidos(prev => {
            const actuales = prev[empleadoId] || [];
            const yaExpandido = actuales.includes(anio);
            return {
                ...prev,
                [empleadoId]: yaExpandido ? actuales.filter(a => a !== anio) : [...actuales, anio]
            };
        });
    };

    const buscarLiquidacion = (empleado, anio, mes) => {
        return (empleado.liquidaciones || []).find(l => l.anio === anio && l.mes === mes);
    };

    const manejarClickMes = async (empleado, anio, mes, liquidacion) => {
        if (liquidacion) {
            setLocation(`/liquidacion/${liquidacion.id}`);
            return;
        }

        try {
            const res = await api.post('/liquidaciones', { empleado_id: empleado.id, anio, mes });
            setLocation(`/liquidacion/${res.data.liquidacion_id}`);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                setLocation(`/liquidacion/${error.response.data.liquidacion_id}`);
            } else {
                alert(error.response?.data?.error || 'Error al crear la liquidación.');
            }
        }
    };

    const etiquetaEstado = (liquidacion) => {
        if (!liquidacion) return { texto: 'Vacío', clase: 'VACIO' };
        if (liquidacion.estado === 'FINALIZADA') return { texto: 'Cerrada', clase: 'FINALIZADA' };
        return { texto: 'Borrador', clase: 'BORRADOR' };
    };

    const renderListaEmpleados = (empleados, inactivos = false) => {
        if (!empleados || empleados.length === 0) {
            return <p className="texto-vacio">No hay empleados {inactivos ? 'dados de baja' : 'registrados'}.</p>;
        }

        return (
            <div className="empleados-lista">
                {empleados.map(emp => {
                    const anios = generarAnios(emp);
                    const empleadoExpandido = empleadosExpandidos[emp.id];
                    const aniosAbiertos = aniosExpandidos[emp.id] || [];

                    return (
                        <div key={emp.id} className={`empleado-fila ${inactivos ? 'item-inactivo' : ''}`}>
                            <div className="empleado-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div onClick={() => toggleEmpleado(emp.id)} style={{ flexGrow: 1, cursor: 'pointer' }}>
                                    <span className="empleado-nombre">
                                        👤 {emp.apellido}, {emp.nombre} {inactivos && '(Baja)'}
                                    </span>
                                    <span className="empleado-detalle">
                                        Legajo: {emp.nro_legajo} · CUIL: {emp.cuil}
                                    </span>
                                </div>
                                
                                {!inactivos && (
                                    <div style={{ display: 'flex', gap: '8px', zIndex: 2 }}>
                                        <button 
                                            className="btn-accion" 
                                            onClick={(e) => { e.stopPropagation(); setLocation(`/empleado/editar/${emp.id}`); }}
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            className="btn-peligro" 
                                            onClick={(e) => { e.stopPropagation(); handleBajaEmpleado(emp.id, `${emp.nombre} ${emp.apellido}`); }}
                                        >
                                            Baja
                                        </button>
                                    </div>
                                )}
                            </div>

                            {empleadoExpandido && (
                                <div className="anios-lista">
                                    {anios.map(anio => {
                                        const anioExpandido = aniosAbiertos.includes(anio);
                                        return (
                                            <div key={anio} className="anio-bloque">
                                                <div className="anio-header" onClick={() => toggleAnio(emp.id, anio)}>
                                                    <span className="icono">{anioExpandido ? '▾' : '▸'}</span>
                                                    Año {anio}
                                                </div>

                                                {anioExpandido && (
                                                    <div className="meses-grid">
                                                        {MESES.map((mesNombre, i) => {
                                                            const mes = i + 1;
                                                            const liquidacion = buscarLiquidacion(emp, anio, mes);
                                                            const estado = etiquetaEstado(liquidacion);

                                                            return (
                                                                <button
                                                                    key={mes}
                                                                    className={`mes-celda estado-${estado.clase}`}
                                                                    onClick={() => manejarClickMes(emp, anio, mes, liquidacion)}
                                                                    title={`${mesNombre} ${anio} — ${estado.texto}`}
                                                                    disabled={inactivos && !liquidacion} // Bloquear creación si es inactivo
                                                                >
                                                                    <span className="mes-nombre">{mesNombre}</span>
                                                                    <span className="mes-estado">{estado.texto}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const clientesActivos = clientes.filter(c => !c.eliminado);
    const clientesInactivos = clientes.filter(c => c.eliminado);

    return (
        <div className="vista-principal">
            <header className="cabecera-acciones">
                <h2>Directorio de Clientes</h2>
                <Link to="/cliente/nuevo"><button className="btn-primario">+ Nuevo Cliente</button></Link>
            </header>

            <div className="lista-carpetas">
                {/* SECCIÓN CLIENTES ACTIVOS */}
                {clientesActivos.map(cliente => {
                    const progreso = calcularProgreso(cliente);
                    const empActivos = (cliente.empleados || []).filter(e => !e.eliminado);
                    const empInactivos = (cliente.empleados || []).filter(e => e.eliminado);

                    return (
                        <div key={cliente.id} className="carpeta">
                            <div className="carpeta-header" onClick={() => toggleExpand(cliente.id)}>
                                <span className="icono">{expandidos[cliente.id] ? '📂' : '📁'}</span>
                                <span className="titulo-carpeta">{cliente.razon_social}</span>
                                <span className="cuit-carpeta">CUIT: {cliente.cuit}</span>
                                <span
                                    className={`progreso-mes ${progreso.clase}`}
                                    title={`${progreso.hechas} de ${progreso.total} empleados activos con liquidación cerrada este mes`}
                                >
                                    {progreso.hechas}/{progreso.total}
                                </span>
                            </div>

                            {expandidos[cliente.id] && (
                                <div className="carpeta-contenido">
                                    <div className="acciones-internas" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                        <Link to={`/empleado/nuevo/${cliente.id}`}>
                                            <button className="btn-primario">+ Agregar Empleado</button>
                                        </Link>
                                        <button className="btn-accion" onClick={() => setLocation(`/cliente/editar/${cliente.id}`)}>
                                            Editar Cliente
                                        </button>
                                        <button className="btn-peligro" onClick={() => handleBajaCliente(cliente.id, cliente.razon_social)}>
                                            Dar de Baja
                                        </button>
                                    </div>

                                    {renderListaEmpleados(empActivos, false)}

                                    {empInactivos.length > 0 && (
                                        <div className="mt-2" style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                                            <h4 style={{ color: '#888', marginBottom: '10px' }}>Empleados dados de baja</h4>
                                            {renderListaEmpleados(empInactivos, true)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* SECCIÓN CLIENTES DADOS DE BAJA */}
                {clientesInactivos.length > 0 && (
                    <div style={{ marginTop: '30px' }}>
                        <h3 style={{ color: '#888', marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid #ddd' }}>
                            Clientes dados de baja
                        </h3>
                        {clientesInactivos.map(cliente => (
                            <div key={cliente.id} className="carpeta item-inactivo">
                                <div className="carpeta-header" onClick={() => toggleExpand(cliente.id)}>
                                    <span className="icono">{expandidos[cliente.id] ? '📂' : '📁'}</span>
                                    <span className="titulo-carpeta">{cliente.razon_social} (Baja)</span>
                                    <span className="cuit-carpeta">CUIT: {cliente.cuit}</span>
                                </div>

                                {expandidos[cliente.id] && (
                                    <div className="carpeta-contenido">
                                        {renderListaEmpleados(cliente.empleados, true)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}