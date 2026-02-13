import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Configure axios defaults
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['x-auth-token'] = token;
            localStorage.setItem('token', token);
        } else {
            delete axios.defaults.headers.common['x-auth-token'];
            localStorage.removeItem('token');
        }
    }, [token]);

    // Check if user is logged in (verify token)
    useEffect(() => {
        const checkAuth = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                // We can use the /game/state endpoint to verify token and get user data
                // For now, just assuming token is valid if present, but ideally we fetch user
                // const res = await axios.get('/api/game/state'); 
                // setUser(res.data.character); // Or just set a flag
                setLoading(false);
            } catch (err) {
                logout();
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        if (email === 'guest@solo.level') {
            const token = 'guest-token-demo';
            setToken(token);
            setUser({ name: 'Jinwoo (Guest)', email });
            return { token };
        }
        const res = await axios.post('/api/auth/login', { email, password });
        setToken(res.data.token);
        return res.data;
    };

    const register = async (email, password) => {
        const res = await axios.post('/api/auth/register', { email, password });
        setToken(res.data.token);
        return res.data;
    };

    const updateProfile = (updates) => {
        setUser(prev => ({ ...prev, ...updates }));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
