import React from 'react';
import { motion } from 'framer-motion';

export default function CircularProgress({
    value = 0,
    max = 100,
    size = 140,
    strokeWidth = 10,
    color = 'var(--accent-xp)',
    label,
    sublabel
}) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                    {/* Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Fill */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                    />
                </svg>
                {/* Center text */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {Math.round(percentage)}%
                    </span>
                </div>
            </div>
            {label && <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>}
            {sublabel && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -8 }}>{sublabel}</div>}
        </div>
    );
}
