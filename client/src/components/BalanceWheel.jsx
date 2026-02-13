import React from 'react';
import { motion } from 'framer-motion';

const STATS = [
    { key: 'str', label: 'STR' },
    { key: 'agi', label: 'AGI' },
    { key: 'int', label: 'INT' },
    { key: 'vit', label: 'VIT' },
    { key: 'per', label: 'PER' }
];

export default function BalanceWheel({ data = { str: 75, agi: 60, int: 85, vit: 50, per: 65 } }) {
    const size = 260;
    const center = size / 2;
    const radius = 90;
    const angleStep = (Math.PI * 2) / 5;

    // Helper to get coordinates
    const getPoint = (index, value = 100) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Calculate polygon points
    const points = STATS.map((stat, i) => {
        const val = data[stat.key] || 0;
        const { x, y } = getPoint(i, val);
        return `${x},${y}`;
    }).join(' ');

    // Calculate background grid (5 levels)
    const gridLevels = [100, 80, 60, 40, 20].map(level => {
        return STATS.map((_, i) => {
            const { x, y } = getPoint(i, level);
            return `${x},${y}`;
        }).join(' ');
    });

    return (
        <div className="relative flex flex-col items-center justify-center h-full">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Grid */}
                {gridLevels.map((points, i) => (
                    <polygon
                        key={i}
                        points={points}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="1"
                    />
                ))}

                {/* Axis Lines */}
                {STATS.map((_, i) => {
                    const { x, y } = getPoint(i, 100);
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={x}
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Data Polygon */}
                <motion.polygon
                    points={points}
                    fill="rgba(50, 215, 75, 0.2)"
                    stroke="var(--accent-skill)"
                    strokeWidth="2"
                    initial={{ scale: 0, opacity: 0, originX: '50%', originY: '50%' }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />

                {/* Stat Labels */}
                {STATS.map((stat, i) => {
                    const { x, y } = getPoint(i, 125);
                    return (
                        <text
                            key={stat.key}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="var(--text-secondary)"
                            fontSize="12"
                            fontWeight="600"
                            style={{ textTransform: 'uppercase' }}
                        >
                            {stat.label}
                        </text>
                    );
                })}

                {/* Value Dots */}
                {STATS.map((stat, i) => {
                    const val = data[stat.key] || 0;
                    const { x, y } = getPoint(i, val);
                    return (
                        <motion.circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#fff"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                        />
                    );
                })}
            </svg>

            <div className="absolute bottom-4 text-xs text-muted uppercase tracking-wider">
                Total Stats: {Object.values(data).reduce((a, b) => a + b, 0)}
            </div>
        </div>
    );
}
