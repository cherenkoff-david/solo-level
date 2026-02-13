import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Flame, ArrowUpRight, Shield, RefreshCw } from 'lucide-react';

import CircularProgress from './ui/CircularProgress';
import Button from './ui/Button';

// Refined mock data
const MOCK_DATA = {
    character: {
        name: 'Jinwoo',
        level: 12,
        xp: 2450,
        max_xp: 5000,
        hp: 85,
        max_hp: 100,
        coins: 1250,
        current_login_streak: 7
    },
    tasks: [
        { id: 1, title: 'Complete System Design', difficulty: 'HARD', rewards: { xp: 50, coins: 20 }, status: 'ACTIVE' },
        { id: 2, title: 'Morning Workout', difficulty: 'MEDIUM', rewards: { xp: 20, coins: 10 }, status: 'COMPLETED' },
        { id: 3, title: 'Read Documentation', difficulty: 'EASY', rewards: { xp: 10, coins: 5 }, status: 'ACTIVE' },
    ],
    habits: [
        { id: 1, title: 'Drink Water', streak: 12, is_active: true, last_completed_date: '2023-01-01' },
        { id: 2, title: 'Code Practice', streak: 45, is_active: true, last_completed_date: '2023-01-01' },
    ]
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulating data fetch for smoothness
        setTimeout(() => {
            setData(MOCK_DATA);
            setLoading(false);
        }, 500);
    }, []);

    if (loading) return null; // or skeleton

    const { character, tasks, habits } = data;

    return (
        <div className="dashboard-grid grid-12">

            {/* ── Top Row: Progress Widgets (Bento Style) ── */}

            {/* Daily Quest Widget (Yellow) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="col-span-4 card-widget card-widget-yellow flex flex-col justify-between"
                style={{ height: 260 }}
            >
                <div>
                    <div className="flex justify-between items-start">
                        <h3>Daily Quest</h3>
                        <div style={{ background: 'rgba(0,0,0,0.1)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={20} color="black" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="stat-value">3 / 5</div>
                        <div style={{ fontSize: 16, opacity: 0.7, marginTop: 4, fontWeight: 500, color: 'black' }}>Tasks Completed</div>
                    </div>
                </div>

                {/* Progress Bar within widget */}
                <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.1)', borderRadius: 4 }}>
                    <div style={{ width: '60%', height: '100%', background: 'black', borderRadius: 4 }} />
                </div>
            </motion.div>

            {/* Streak Widget (Green) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="col-span-4 card-widget card-widget-green flex flex-col justify-between"
                style={{ height: 260 }}
            >
                <div className="flex justify-between items-start">
                    <h3>Login Streak</h3>
                    <div style={{ background: 'rgba(0,0,0,0.1)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Flame size={20} color="black" />
                    </div>
                </div>

                <div className="text-center my-auto">
                    <div style={{ fontSize: 64, fontWeight: 800, color: 'black' }}>{character.current_login_streak}</div>
                    <div style={{ color: 'black', fontWeight: 600 }}>Days Active</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '8px 16px', borderRadius: 20, textAlign: 'center', fontSize: 13, color: 'black', fontWeight: 600 }}>
                    Keep it up!
                </div>
            </motion.div>

            {/* Level Widget (Purple) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="col-span-4 card-widget card-widget-purple flex flex-col justify-between"
                style={{ height: 260 }}
            >
                <div className="flex justify-between items-start">
                    <h3>Current Level</h3>
                    <div style={{ background: 'rgba(255,255,255,0.1)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={20} color="white" />
                    </div>
                </div>

                <div className="flex items-center gap-md">
                    <CircularProgress
                        value={50}
                        size={100}
                        strokeWidth={8}
                        color="#fff"
                        label=""
                    />
                    <div>
                        <div style={{ fontSize: 40, fontWeight: 700 }}>{character.level}</div>
                        <div style={{ opacity: 0.8 }}>S-Rank</div>
                    </div>
                </div>

                <div style={{ fontSize: 13, opacity: 0.8 }}>
                    2,450 / 5,000 XP to Level Up
                </div>
            </motion.div>

            {/* ── Middle Row: Tasks & Habits ── */}

            {/* Priority Tasks */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="col-span-8 glass-card"
                style={{ minHeight: 400 }}
            >
                <div className="flex justify-between items-center mb-8">
                    <h2>Priority Missions</h2>
                    <Button variant="outline" className="btn-sm">See All</Button>
                </div>

                <div className="flex flex-col gap-md">
                    {tasks.map((task, i) => (
                        <div key={task.id} className="flex items-center gap-lg p-4 rounded-xl hover:bg-white/5 transition-colors group">
                            <button className="btn-icon">
                                {task.status === 'COMPLETED' ? <CheckCircle2 size={24} className="text-green-400" /> : <Circle size={24} />}
                            </button>
                            <div className="flex-1">
                                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                                <div className="flex gap-sm">
                                    <span className="badge badge-outline">{task.difficulty}</span>
                                    <span className="text-muted text-xs flex items-center">+{task.rewards.xp} XP</span>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button className="btn-sm">Details</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Quick Habits */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="col-span-4 glass-card"
            >
                <h3 className="mb-6">Protocols</h3>
                <div className="flex flex-col gap-sm">
                    {habits.map(habit => (
                        <div key={habit.id} className="p-4 rounded-2xl bg-white/5 flex justify-between items-center">
                            <div>
                                <div style={{ fontWeight: 600 }}>{habit.title}</div>
                                <div style={{ fontSize: 12, opacity: 0.5 }}>{habit.streak} day streak</div>
                            </div>
                            <button className="btn-icon" style={{ width: 32, height: 32 }}>
                                <CheckCircle2 size={18} />
                            </button>
                        </div>
                    ))}
                    <div className="p-4 rounded-2xl border border-dashed border-white/10 flex justify-center items-center text-muted cursor-pointer hover:bg-white/5 transition-colors">
                        Add New Protocol
                    </div>
                </div>
            </motion.div>

        </div>
    );
}
