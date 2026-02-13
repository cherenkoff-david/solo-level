import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(email, password);
            navigate('/'); // Or to character creation? For MVP dashboard is fine, it will show default char
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
            <div className="system-window" style={{ width: '100%', maxWidth: 400 }}>
                <h2 style={{ textAlign: 'center' }}>Awaken Player</h2>
                {error && <div style={{ color: 'var(--status-hp)', marginBottom: 10, textAlign: 'center' }}>⚠ {error}</div>}
                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
                    <div>
                        <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--text-secondary)' }}>EMAIL</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--text-secondary)' }}>PASSWORD</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" variant="primary" style={{ marginTop: 10 }}>Accept System Invitation</Button>
                </form>
                <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <p>Already Awakened? <Link to="/login" style={{ color: 'var(--accent-blue)' }}>Login</Link></p>
                </div>
            </div>
        </div>
    );
}
