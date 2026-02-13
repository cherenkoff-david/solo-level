import React from 'react';

export default function ProgressBar({
    value,
    max,
    color = 'var(--accent-xp)',
    label,
    height = 14,
    showValue = true,
    glow = false
}) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="progress-container">
            {label && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    fontSize: 12,
                    color: 'var(--text-secondary)'
                }}>
                    <span>{label}</span>
                    {showValue && <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value} / {max}</span>}
                </div>
            )}
            <div style={{
                background: 'rgba(255,255,255,0.06)',
                height: height,
                borderRadius: height,
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    borderRadius: height,
                    background: height > 10
                        ? `linear-gradient(90deg, ${color}, ${color}cc)`
                        : color,
                    transition: 'width 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    boxShadow: glow ? `0 0 12px ${color}60` : 'none',
                    position: 'relative'
                }}>
                    {height > 10 && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                            borderRadius: height
                        }} />
                    )}
                </div>
            </div>
        </div>
    );
}
