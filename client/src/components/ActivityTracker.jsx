import React, { useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ActivityTracker() {
    const { token } = useAuth();

    useEffect(() => {
        if (!token) return;

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                sendHeartbeat();
            }
        }, 60000); // Every 60 seconds

        // Initial heartbeat on mount
        sendHeartbeat();

        return () => clearInterval(interval);
    }, [token]);

    const sendHeartbeat = async () => {
        try {
            await axios.post('/api/game/activity/heartbeat');
        } catch (err) {
            console.error('Heartbeat failed', err);
        }
    };

    return null; // Invisible component
}
