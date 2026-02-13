import React, { useState } from 'react';

const defaultAxes = [
    { label: 'Health', key: 'health' },
    { label: 'Work', key: 'work' },
    { label: 'Learning', key: 'learning' },
    { label: 'Social', key: 'social' },
    { label: 'Finance', key: 'finance' },
    { label: 'Creative', key: 'creative' },
];

export default function RadarChart({
    data = {},
    axes = defaultAxes,
    size = 280,
    color = 'var(--accent-xp)',
    maxValue = 100
}) {
    const [hoveredAxis, setHoveredAxis] = useState(null);
    const center = size / 2;
    const radius = size / 2 - 30;
    const levels = 4;
    const angleStep = (2 * Math.PI) / axes.length;

    const getPoint = (index, value) => {
        const angle = angleStep * index - Math.PI / 2;
        const r = (value / maxValue) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Grid lines
    const gridLines = [];
    for (let level = 1; level <= levels; level++) {
        const points = axes.map((_, i) => {
            const p = getPoint(i, (level / levels) * maxValue);
            return `${p.x},${p.y}`;
        }).join(' ');
        gridLines.push(
            <polygon
                key={`grid-${level}`}
                points={points}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
            />
        );
    }

    // Axis lines
    const axisLines = axes.map((_, i) => {
        const p = getPoint(i, maxValue);
        return (
            <line
                key={`axis-${i}`}
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
            />
        );
    });

    // Data polygon
    const dataPoints = axes.map((axis, i) => {
        const val = data[axis.key] || 0;
        const p = getPoint(i, val);
        return `${p.x},${p.y}`;
    }).join(' ');

    // Labels
    const labels = axes.map((axis, i) => {
        const p = getPoint(i, maxValue + 18);
        const isHovered = hoveredAxis === i;
        return (
            <text
                key={`label-${i}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? '#fff' : 'rgba(255,255,255,0.5)'}
                fontSize="11"
                fontFamily="Inter, sans-serif"
                fontWeight={isHovered ? '600' : '400'}
                style={{ transition: 'all 0.15s', cursor: 'default' }}
                onMouseEnter={() => setHoveredAxis(i)}
                onMouseLeave={() => setHoveredAxis(null)}
            >
                {axis.label}
            </text>
        );
    });

    // Data dots
    const dots = axes.map((axis, i) => {
        const val = data[axis.key] || 0;
        const p = getPoint(i, val);
        const isHovered = hoveredAxis === i;
        return (
            <circle
                key={`dot-${i}`}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3}
                fill={isHovered ? '#fff' : color}
                stroke={color}
                strokeWidth="2"
                style={{ transition: 'all 0.15s', cursor: 'default' }}
                onMouseEnter={() => setHoveredAxis(i)}
                onMouseLeave={() => setHoveredAxis(null)}
            />
        );
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {gridLines}
            {axisLines}
            <polygon
                points={dataPoints}
                fill="rgba(91, 140, 255, 0.15)"
                stroke={color}
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 4px rgba(91,140,255,0.3))' }}
            />
            {dots}
            {labels}
        </svg>
    );
}
