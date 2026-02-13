import React from 'react';
import BalanceWheel from '../components/BalanceWheel';

const MOCK_STATS = {
    str: 85,
    agi: 70,
    int: 92,
    vit: 65,
    per: 78
};

const ProgressPage = () => {
    return (
        <div className="grid-12">
            <div className="col-span-12 mb-6">
                <h1>Progress Report</h1>
                <p className="text-secondary">Track your hunter growth statistics over time.</p>
            </div>

            {/* XP History */}
            <div className="col-span-8 glass-card">
                <h3 className="mb-6">XP Acquisition History</h3>
                <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 20, padding: '20px 0' }}>
                    {[40, 65, 30, 85, 50, 90, 60].map((h, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                            <div style={{
                                width: '100%',
                                height: `${h}%`,
                                background: 'linear-gradient(180deg, var(--accent-xp) 0%, rgba(91,140,255,0.1) 100%)',
                                borderRadius: '4px 4px 0 0',
                                opacity: 0.8
                            }} />
                            <span className="text-muted" style={{ fontSize: 12 }}>Day {i + 1}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Balance Wheel */}
            <div className="col-span-4 glass-card flex flex-col">
                <h3 className="mb-4">Ability Analysis</h3>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BalanceWheel data={MOCK_STATS} />
                </div>
            </div>

            {/* Stats Row */}
            <div className="col-span-12 grid-12 gap-lg" style={{ marginTop: 24 }}>
                <div className="col-span-6 glass-card flex flex-col items-center justify-center p-8">
                    <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--accent-xp)' }}>12</div>
                    <div className="text-secondary">Tasks Completed This Week</div>
                </div>
                <div className="col-span-6 glass-card flex flex-col items-center justify-center p-8">
                    <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--accent-hp)' }}>98%</div>
                    <div className="text-secondary">Survival Rate</div>
                </div>
            </div>

            {/* Log */}
            <div className="col-span-12 glass-card mt-6">
                <h3 className="mb-4">System Log</h3>
                <div className="flex flex-col gap-sm">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                            borderBottom: '1px solid var(--border-card)',
                            padding: '12px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div className="flex items-center gap-md">
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-xp)'
                                }} />
                                <span>Quest "Refactor Codebase" Completed</span>
                            </div>
                            <span className="text-muted" style={{ fontSize: 12 }}>2 hours ago</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgressPage;
