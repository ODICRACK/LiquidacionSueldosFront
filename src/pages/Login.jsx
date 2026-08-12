import { useState } from 'react';
import { useLocation } from 'wouter';
import api from '../services/api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [, setLocation] = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const response = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', response.data.token);
            setLocation('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al conectar con el servidor.');
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-form">
                <h2>Ingreso al Sistema</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                    <label>Email</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>
                <div className="form-group">
                    <label>Contraseña</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                </div>
                <button type="submit">Ingresar</button>
            </form>
        </div>
    );
}   