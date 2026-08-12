import './App.css';

import { Route, Switch, Redirect, Link } from 'wouter';
import Login from './pages/Login';
import Home from './pages/Home';
import Clientes from './pages/Clientes';
import ClienteForm from './pages/ClienteForm';
import EmpleadoForm from './pages/EmpleadoForm';
import Liquidacion from './pages/Liquidacion';
import Items from './pages/Items';
import ItemForm from './pages/ItemForm';

// Componente para proteger rutas
const ProtectedRoute = ({ component: Component, ...rest }) => {
    const isAuthenticated = !!localStorage.getItem('token');
    if (!isAuthenticated) return <Redirect to="/login" />;
    
    return (
        <div className="app-layout">
            <nav className="navbar">
                <Link to="/"><h1>Sistema de Liquidaciones</h1></Link>
                <div className="nav-links">
                    <Link to="/clientes">Clientes</Link>
                    <Link to="/items">Items</Link>
                    <a href="/login" onClick={() => localStorage.removeItem('token')}>Salir</a>
                </div>
            </nav>
            <main className="main-content">
                <Component {...rest} />
            </main>
        </div>
    );
};

function App() {
    return (
        <Switch>
            <Route path="/login" component={Login} />
            
            {/* Rutas Protegidas */}
            <Route path="/"><ProtectedRoute component={Home} /></Route>
            <Route path="/clientes"><ProtectedRoute component={Clientes} /></Route>
            <Route path="/cliente/nuevo"><ProtectedRoute component={ClienteForm} /></Route>
            
            <Route path="/empleado/nuevo/:cliente_id">
                {params => <ProtectedRoute component={EmpleadoForm} params={params} />}
            </Route>
            
            <Route path="/liquidacion/:id">
                {params => <ProtectedRoute component={Liquidacion} params={params} />}
            </Route>

            <Route path="/items"><ProtectedRoute component={Items} /></Route>
            <Route path="/item/nuevo"><ProtectedRoute component={ItemForm} /></Route>
            
            <Route>
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <h1>404 - Ruta no encontrada</h1>
                    <Link to="/">Volver al inicio</Link>
                </div>
            </Route>
        </Switch>
    );
}

export default App;