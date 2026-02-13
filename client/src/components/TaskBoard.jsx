import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import Button from './ui/Button';

const DIFFICULTY = {
    VERY_EASY: 'VERY_EASY',
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD',
    VERY_HARD: 'VERY_HARD'
};

const MOCK_TASKS = [
    { id: 1, title: 'Complete System Design', difficulty: 'HARD', rewards: { xp: 50, coins: 20 }, status: 'ACTIVE', deadline: '2023-12-31' },
    { id: 2, title: 'Morning Workout', difficulty: 'MEDIUM', rewards: { xp: 20, coins: 10 }, status: 'COMPLETED', deadline: '2023-12-30' },
    { id: 3, title: 'Read Documentation', difficulty: 'EASY', rewards: { xp: 10, coins: 5 }, status: 'ACTIVE', deadline: null },
    { id: 4, title: 'Fix API Bug', difficulty: 'VERY_HARD', rewards: { xp: 100, coins: 50 }, status: 'FAILED', deadline: '2023-12-01' },
];

export default function TaskBoard() {
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('ACTIVE');
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState('EASY');
    const [deadline, setDeadline] = useState('');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await axios.get('/api/game/state');
            setTasks(res.data.tasks);
        } catch (err) {
            console.warn('Using mock tasks:', err);
            setTasks(MOCK_TASKS);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/game/tasks', { title, difficulty, deadline: deadline || null });
            setTitle('');
            setDeadline('');
            setIsCreating(false);
            fetchTasks();
        } catch (err) {
            alert('Failed to create task (Mock mode)');
            // Mock add
            setTasks([...tasks, {
                id: Date.now(),
                title,
                difficulty,
                status: 'ACTIVE',
                rewards: { xp: 10, coins: 5 }, // Mock rewards
                deadline: deadline || null
            }]);
            setIsCreating(false);
        }
    };

    const completeTask = async (id) => {
        try {
            await axios.post(`/api/game/tasks/${id}/complete`);
            fetchTasks();
        } catch (err) {
            // Mock complete
            setTasks(tasks.map(t => t.id === id ? { ...t, status: 'COMPLETED' } : t));
        }
    };

    const getDifficultyColor = (d) => {
        switch (d) {
            case 'VERY_HARD': return 'var(--accent-hp)';
            case 'HARD': return '#FF7875'; // Light red
            case 'MEDIUM': return 'var(--accent-coin)';
            case 'EASY': return 'var(--accent-xp)';
            case 'VERY_EASY': return '#87d068';
            default: return 'var(--text-muted)';
        }
    };

    const filteredTasks = tasks.filter(t => t.status === filter);

    return (
        <div className="relative h-full">
            {/* Header */}
            <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
                <h1>Task Board</h1>
                <Button onClick={() => setIsCreating(true)} variant="primary">
                    <Plus size={18} />
                    Create Mission
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-md" style={{ marginBottom: 24, borderBottom: '1px solid var(--border-card)', paddingBottom: 16 }}>
                {['ACTIVE', 'COMPLETED', 'FAILED'].map(f => (
                    <Button
                        key={f}
                        onClick={() => setFilter(f)}
                        variant={filter === f ? 'primary' : 'default'}
                        className="text-sm"
                    >
                        {f}
                    </Button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid-12" style={{ alignContent: 'start' }}>
                <AnimatePresence mode="popLayout">
                    {filteredTasks.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-12 empty-state"
                        >
                            <AlertCircle size={48} />
                            <p>No missions found in this category.</p>
                        </motion.div>
                    )}

                    {filteredTasks.map(task => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            layout
                            className="col-span-6 glass-card hover:border-active transition-colors group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className={`text-lg font-semibold ${task.status === 'COMPLETED' ? 'line-through text-muted' : ''}`} style={{ marginBottom: 12 }}>
                                        {task.title}
                                    </h3>
                                    <div className="flex gap-sm" style={{ marginBottom: 16 }}>
                                        <span className="badge" style={{
                                            borderColor: getDifficultyColor(task.difficulty),
                                            color: getDifficultyColor(task.difficulty),
                                            border: '1px solid',
                                            background: 'transparent'
                                        }}>
                                            {task.difficulty.replace('_', ' ')}
                                        </span>
                                        {task.deadline && (
                                            <span className="text-secondary text-xs flex items-center">
                                                Due: {new Date(task.deadline).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => task.status === 'ACTIVE' && completeTask(task.id)}
                                    disabled={task.status !== 'ACTIVE'}
                                    className="btn-icon transition-transform active:scale-90"
                                    style={{
                                        color: task.status === 'COMPLETED' ? 'var(--accent-success)' : 'var(--text-muted)'
                                    }}
                                >
                                    {task.status === 'COMPLETED' ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                                </button>
                            </div>

                            <div className="flex justify-between items-center text-xs text-secondary pt-4 border-t border-card">
                                <div style={{ marginTop: 4 }}>REWARDS</div>
                                <div className="flex gap-md font-mono" style={{ marginTop: 4 }}>
                                    <span style={{ color: 'var(--accent-xp)' }}>+{task.rewards?.xp || 0} XP</span>
                                    <span style={{ color: 'var(--accent-coin)' }}>+{task.rewards?.coins || 0} G</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Slide-over Creation Panel */}
            <AnimatePresence>
                {isCreating && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="overlay"
                            onClick={() => setIsCreating(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="slide-over"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2>New Mission</h2>
                                <button onClick={() => setIsCreating(false)} className="btn-icon">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="flex flex-col gap-lg">
                                <div>
                                    <label className="block text-secondary text-sm mb-2">Objective</label>
                                    <input
                                        className="input"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Enter mission title..."
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-secondary text-sm mb-2">Difficulty Class</label>
                                    <select
                                        className="input"
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value)}
                                    >
                                        {Object.keys(DIFFICULTY).map(d => (
                                            <option key={d} value={d}>{d.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-secondary text-sm mb-2">Deadline (Optional)</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                    />
                                </div>

                                <div className="mt-8 pt-6 border-t border-card flex justify-end gap-sm">
                                    <Button onClick={() => setIsCreating(false)}>Cancel</Button>
                                    <Button type="submit" variant="primary">Initialize Mission</Button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
