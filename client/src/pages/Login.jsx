import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            // Wait a bit or redirect immediately?
            // For now immediate
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
            <div className="system-window" style={{ width: '100%', maxWidth: 400 }}>
                <h2 style={{ textAlign: 'center' }}>System Login</h2>
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
                    <Button type="submit" style={{ marginTop: 10 }}>Initialize</Button>
                    <button
                        type="button"
                        onClick={() => {
                            login('guest@solo.level', 'guest');
                            navigate('/');
                        }}
                        className="text-xs text-muted hover:text-primary transition-colors mt-2"
                    >
                        Initialize as Guest (Demo)
                    </button>
                </form>
                <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <p>New Player? <Link to="/register" style={{ color: 'var(--accent-blue)' }}>Accept Invitation</Link></p>
                </div>
            </div>
        </div>
    );
}
