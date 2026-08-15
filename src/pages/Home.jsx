import { Link } from 'wouter';

export default function Home() {
    return (
        <div className="home-container">
            <h2>Panel Principal</h2>
            <div className="accesos-rapidos">
                <Link to="/clientes">
                    <button className="btn-primario">📂 Gestión de Clientes y Empleados</button>
                </Link>
                <Link to="/items">
                    <button className="btn-secundario">⚙️ Configuración Global de Items</button>
                </Link>
                <Link to="/categorias">
                    <button className="btn-secundario" style={{ marginLeft: '10px' }}>📊 Gestión de Categorías</button>
                </Link>
            </div>
        </div>
    );
}
