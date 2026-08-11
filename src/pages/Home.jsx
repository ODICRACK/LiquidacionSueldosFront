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
            </div>
        </div>
    );
}