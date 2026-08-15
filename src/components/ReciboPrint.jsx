import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const ReciboPrint = React.forwardRef(({ data }, ref) => {
    if (!data) return null;

    const { empresa, empleado, liquidacion, detalle, totales, grafico } = data;

    // --- Helpers de Formateo ---
    const formatMoney = (amount) => {
        const val = parseFloat(amount || 0);
        return `$ ${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getUnidad = (item) => {
        if (item.unidad_imprimible) return item.unidad_imprimible;
        if (item.tipo === 'PORCENTAJE') return `${item.porcentaje}%`;
        if (item.tipo === 'MANUAL') return formatMoney(item.valor_ingresado);
        return '-';
    };

    const getBase = (item) => {
        if (item.base_imprimible) return item.base_imprimible;
        if (item.tipo === 'PORCENTAJE' && item.porcentaje && parseFloat(item.porcentaje) !== 0) {
            const monto = parseFloat(item.valor_ingresado || 0);
            const pct = parseFloat(item.porcentaje);
            const base = monto / (pct / 100);
            return formatMoney(base);
        }
        return '-';
    };

    const calcularAntiguedad = () => {
        if (!empleado.fecha_ingreso) return '0 años';
        const anioIngreso = new Date(empleado.fecha_ingreso).getFullYear();
        const anioActual = new Date().getFullYear();
        return `${Math.max(0, anioActual - anioIngreso)} años`;
    };

    const totalInformativos = detalle.informativos.reduce((acc, curr) => acc + parseFloat(curr.valor_ingresado || 0), 0);

    // Configuración del Gráfico de Torta
    const chartData = {
        labels: grafico.map(g => g.nombre),
        datasets: [
            {
                data: grafico.map(g => g.total),
                backgroundColor: ['#2563eb', '#16a34a', '#ca8a04', '#dc2626', '#9333ea', '#475569', '#0891b2'],
                borderWidth: 1,
            },
        ],
    };

    // Estilos Visuales de Referencia
    const fontMain = 'Arial, sans-serif';
    const colorAzulOscuro = '#1a3b8a';
    const colorAzulClaro = '#5b74a6';

    const colHeadStyle = { background: colorAzulClaro, color: '#fff', padding: '4px', textAlign: 'center', border: '1px solid #000', fontSize: '11px' };
    const rowStyle = { borderBottom: '1px dashed #ccc', fontSize: '11px' };
    const cellStyle = { padding: '4px 6px', borderRight: '1px solid #ccc' };
    const cellRight = { ...cellStyle, textAlign: 'right' };

    const renderItemRow = (item, idx) => (
        <tr key={idx} style={rowStyle}>
            <td style={cellStyle}>{item.nombre}</td>
            <td style={cellRight}>{getUnidad(item)}</td>
            <td style={cellRight}>{getBase(item)}</td>
            <td style={cellRight}>{formatMoney(item.monto_real)}</td>
        </tr>
    );

    return (
        <div ref={ref} style={{ padding: '20px 40px', background: '#fff', color: '#000', fontFamily: fontMain, maxWidth: '900px', margin: '0 auto' }}>

            {/* Título Principal */}
            <div style={{ textAlign: 'center', border: '2px solid #000', borderBottom: 'none', padding: '5px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Recibo de Haberes Ley 20.744</h2>
            </div>

            {/* Bloque 1: Encabezado Empresa */}
            <div style={{ border: '2px solid #000', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                <div style={{ fontSize: '14px' }}>EMPRESA<br />{empresa.razon_social}</div>
                <div>{empresa.domicilio ? `${empresa.domicilio} - ` : ''}Tierra del Fuego e Islas del Atlántico Sur</div>
                <div>C.U.I.T. EMPRESA: {empresa.cuit}</div>
            </div>

            {/* Bloque 2: Datos Generales de la Liquidación */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', borderTop: 'none', fontSize: '11px' }}>
                <tbody>
                    <tr style={{ background: colorAzulOscuro, color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000' }}>MES / AÑO</td>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000' }}>APELLIDO Y NOMBRE</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>N° LEGAJO</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>SUELDO BÁSICO</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>ANTIGÜEDAD</td>
                    </tr>
                    <tr style={{ textAlign: 'center', fontWeight: 'bold', background: '#f8f9fa' }}>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000' }}>{liquidacion.mes_anio_impresion}</td>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000', textTransform: 'uppercase' }}>{empleado.nombre_completo}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{empleado.legajo || '-'}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formatMoney(empleado.sueldo_basico)}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{calcularAntiguedad()}</td>
                    </tr>
                    <tr style={{ background: colorAzulOscuro, color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000' }}>FECHA INGRESO</td>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000' }}>CATEGORÍA LABORAL</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>C.U.I.L.</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>BANCO</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>PERÍODO / F. PAGO</td>
                    </tr>
                    <tr style={{ textAlign: 'center', fontWeight: 'bold', background: '#f8f9fa' }}>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000' }}>{empleado.fecha_ingreso ? empleado.fecha_ingreso.split('T')[0] : '-'}</td>
                        <td colSpan={2} style={{ padding: '4px', border: '1px solid #000' }}>{liquidacion.categoria_laboral}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{empleado.cuil}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{liquidacion.banco}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{liquidacion.periodo} ({liquidacion.fecha_pago_aportes})</td>
                    </tr>
                </tbody>
            </table>

            {/* Bloque 3: Costos del Empleador (Informativos) */}
            <div style={{ background: colorAzulOscuro, color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '4px 10px', fontWeight: 'bold', border: '2px solid #000', borderTop: 'none', borderBottom: 'none', fontSize: '12px' }}>
                <span style={{ flexGrow: 1, textAlign: 'center' }}>COSTOS DEL EMPLEADOR</span>
                <span>{formatMoney(totalInformativos)}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', borderTop: 'none' }}>
                <thead>
                    <tr>
                        <th style={{ ...colHeadStyle, textAlign: 'left', width: '45%' }}>CONCEPTO</th>
                        <th style={{ ...colHeadStyle, width: '15%' }}>UNIDAD</th>
                        <th style={{ ...colHeadStyle, width: '20%' }}>BASE</th>
                        <th style={{ ...colHeadStyle, width: '20%' }}>MONTO</th>
                    </tr>
                </thead>
                <tbody>
                    {detalle.informativos.map(renderItemRow)}
                    <tr style={{ background: '#d0d8e8', fontWeight: 'bold', fontSize: '11px' }}>
                        <td colSpan={3} style={{ padding: '6px', textAlign: 'center', borderRight: '1px solid #ccc' }}>SUB TOTAL COSTOS DEL EMPLEADOR</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{formatMoney(totalInformativos)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Bloque 4: Encabezado Sueldo Bruto */}
            <div style={{ background: colorAzulOscuro, color: '#fff', textAlign: 'center', padding: '4px 10px', fontWeight: 'bold', border: '2px solid #000', borderTop: 'none', borderBottom: 'none', fontSize: '12px' }}>
                COMPOSICIÓN SALARIAL
            </div>

            {/* Bloque Principal de Conceptos (Remunerativos, No Remunerativos y Descuentos) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', borderTop: 'none' }}>
                <thead>
                    <tr>
                        <th style={{ ...colHeadStyle, textAlign: 'left', width: '45%' }}>CONCEPTO</th>
                        <th style={{ ...colHeadStyle, width: '15%' }}>UNIDAD</th>
                        <th style={{ ...colHeadStyle, width: '20%' }}>BASE</th>
                        <th style={{ ...colHeadStyle, width: '20%' }}>MONTO</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Grupo REMUNERATIVOS */}
                    <tr>
                        <td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold', background: '#e9e9e9', padding: '4px', fontSize: '11px' }}>REMUNERATIVO</td>
                    </tr>
                    {detalle.haberes.map(renderItemRow)}

                    {/* Grupo NO REMUNERATIVOS */}
                    {detalle.no_remunerativos.length > 0 && (
                        <>
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold', background: '#e9e9e9', padding: '4px', fontSize: '11px', borderTop: '1px solid #ccc' }}>NO REMUNERATIVO</td>
                            </tr>
                            {detalle.no_remunerativos.map(renderItemRow)}
                        </>
                    )}

                    {/* Grupo DESCUENTOS */}
                    <tr>
                        <td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold', background: '#e9e9e9', padding: '4px', fontSize: '11px', borderTop: '1px solid #ccc' }}>DESCUENTOS</td>
                    </tr>
                    {detalle.retenciones.map(renderItemRow)}
                </tbody>
            </table>

            {/* Bloque 5: Resumen Salarial */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', borderTop: 'none', fontSize: '10px', fontWeight: 'bold' }}>
                <tbody>
                    <tr style={{ background: '#fff' }}>
                        <td style={{ padding: '6px', borderRight: '1px solid #000', width: '22%', textTransform: 'uppercase' }}>COMPOSICIÓN SALARIAL</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>Remunerativo:</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{formatMoney(totales.bruto)}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>No Remunerativo:</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{formatMoney(totales.no_remunerativo)}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>Descuentos:</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{formatMoney(totales.descuentos)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Bloque 6: Sueldo Neto Destacado */}
            <div style={{ background: colorAzulOscuro, color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6px', fontWeight: 'bold', border: '2px solid #000', borderTop: 'none', fontSize: '15px', position: 'relative' }}>
                <span>SUELDO NETO $</span>
                <span style={{ position: 'absolute', right: '10px' }}>{formatMoney(totales.neto)}</span>
            </div>

            {/* Sección Inferior: Firmas y Textos Legales */}
            <div style={{ marginTop: '15px', fontSize: '11px' }}>
                <p>Recibí la suma de: ....................................................................................................................................................................</p>
                <p>Depositado en:<br /><i style={{ fontWeight: 'bold' }}>Ushuaia, {new Date().toLocaleDateString('es-AR')}</i></p>
            </div>

            <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'flex-end', paddingRight: '50px' }}>
                <div style={{ borderTop: '1px dashed #000', width: '250px', textAlign: 'center', paddingTop: '5px', fontSize: '11px', fontWeight: 'bold' }}>
                    Firma del Empleado
                </div>
            </div>

            {/* Bloque 7: Gráfico de Torta y Aclaraciones */}
            <div style={{ display: 'flex', marginTop: '30px', borderTop: '2px solid #000', paddingTop: '15px' }}>
                <div style={{ flex: 1, paddingRight: '20px', fontSize: '10px', color: '#333' }}>
                    <p style={{ fontWeight: 'bold', color: '#000', fontSize: '11px', margin: '0 0 8px 0' }}>Detalle de la composición salarial</p>
                    <p style={{ margin: 0, lineHeight: '1.4' }}>Nota: Los conceptos detallados en "Costos del Empleador" constituyen aportes patronales y contribuciones que no se descuentan del sueldo del trabajador, exhibiéndose a fines puramente informativos para evidenciar la composición total del costo laboral.</p>
                </div>
                <div style={{ width: '280px' }}>
                    {grafico.length > 0 && (
                        <Doughnut
                            data={chartData}
                            options={{
                                animation: false,
                                plugins: {
                                    legend: {
                                        display: true,
                                        position: 'right',
                                        labels: { boxWidth: 10, font: { size: 9, family: fontMain } }
                                    }
                                }
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
});