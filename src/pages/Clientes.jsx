import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import api from '../services/api';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL = new Date().getMonth() + 1;

// Cantidad de empleados con liquidación FINALIZADA este mes sobre el total
const calcularProgreso = (cliente) => {
    const total = cliente.empleados.length;
    const hechas = cliente.empleados.filter(emp =>
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

// Genera la serie de años de un empleado (desde su ingreso hasta hoy)
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
    const [expandidos, setExpandidos] = useState({});              // clienteId -> bool
    const [empleadosExpandidos, setEmpleadosExpandidos] = useState({}); // empleadoId -> bool (muestra años)
    const [aniosExpandidos, setAniosExpandidos] = useState({});     // empleadoId -> [años abiertos]
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

    const toggleExpand = (id) => {
        setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleEmpleado = (empleadoId) => {
        setEmpleadosExpandidos(prev => ({ ...prev, [empleadoId]: !prev[empleadoId] }));
    };

    const toggleAnio = (empleadoId, anio) => {
        setAniosExpandidos(prev => {
            const actuales = prev[empleadoId] || [];
            const yaExpandido = actuales.includes(anio);
            return {
                ...prev,
                [empleadoId]: yaExpandido
                    ? actuales.filter(a => a !== anio)
                    : [...actuales, anio]
            };
        });
    };

    // Busca la liquidación de un empleado en un período puntual
    const buscarLiquidacion = (empleado, anio, mes) => {
        return (empleado.liquidaciones || []).find(l => l.anio === anio && l.mes === mes);
    };

    // Comportamiento al apretar un mes: siempre lleva a la liquidación.
    //  - Sin liquidación -> la crea y abre.
    //  - Borrador / Finalizada -> la abre (si está cerrada, desde ahí se ve el recibo PDF).
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
                // Ya existía (la creó otro usuario o recarga): abrimos la existente
                setLocation(`/liquidacion/${error.response.data.liquidacion_id}`);
            } else {
                alert('Error al crear la liquidación.');
            }
        }
    };

    const etiquetaEstado = (liquidacion) => {
        if (!liquidacion) return { texto: 'Vacío', clase: 'VACIO' };
        if (liquidacion.estado === 'FINALIZADA') return { texto: 'Cerrada', clase: 'FINALIZADA' };
        return { texto: 'Borrador', clase: 'BORRADOR' };
    };

    return (
        <div className="vista-principal">
            <header className="cabecera-acciones">
                <h2>Directorio de Clientes</h2>
                <Link to="/cliente/nuevo"><button className="btn-primario">+ Nuevo Cliente</button></Link>
            </header>

            <div className="lista-carpetas">
                {clientes.map(cliente => {
                    const progreso = calcularProgreso(cliente);
                    return (
                    <div key={cliente.id} className="carpeta">
                        <div className="carpeta-header" onClick={() => toggleExpand(cliente.id)}>
                            <span className="icono">{expandidos[cliente.id] ? '📂' : '📁'}</span>
                            <span className="titulo-carpeta">{cliente.razon_social}</span>
                            <span className="cuit-carpeta">CUIT: {cliente.cuit}</span>
                            <span
                                className={`progreso-mes ${progreso.clase}`}
                                title={`${progreso.hechas} de ${progreso.total} empleados con liquidación cerrada este mes`}
                            >
                                {progreso.hechas}/{progreso.total}
                            </span>
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
                                    <div className="empleados-lista">
                                        {cliente.empleados.map(emp => {
                                            const anios = generarAnios(emp);
                                            const empleadoExpandido = empleadosExpandidos[emp.id];
                                            const aniosAbiertos = aniosExpandidos[emp.id] || [];

                                            return (
                                                <div key={emp.id} className="empleado-fila">
                                                    <div className="empleado-header" onClick={() => toggleEmpleado(emp.id)}>
                                                        <span className="empleado-nombre">
                                                            👤 {emp.apellido}, {emp.nombre}
                                                        </span>
                                                        <span className="empleado-detalle">
                                                            Legajo: {emp.nro_legajo} · CUIL: {emp.cuil}
                                                        </span>
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
                                )}
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>
        </div>
    );
}
