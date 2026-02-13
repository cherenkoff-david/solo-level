import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Flame, Check } from 'lucide-react';
import Button from './ui/Button';

const DIFFICULTY = {
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD'
};

const MOCK_HABITS = [
    { id: 1, title: 'Drink Water', streak: 12, is_active: true, difficulty: 'EASY', last_completed_date: '2023-01-01' },
    { id: 2, title: 'Code Practice', streak: 45, is_active: true, difficulty: 'HARD', last_completed_date: '2023-01-01' },
    { id: 3, title: 'Reading', streak: 5, is_active: true, difficulty: 'MEDIUM', last_completed_date: null },
    { id: 4, title: 'Meditation', streak: 0, is_active: true, difficulty: 'EASY', last_completed_date: null },
];

export default function HabitTracker() {
    const [habits, setHabits] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState('EASY');

    useEffect(() => {
        fetchHabits();
    }, []);

    const fetchHabits = async () => {
        try {
            const res = await axios.get('/api/game/state');
            setHabits(res.data.habits);
        } catch (err) {
            console.warn('Using mock habits:', err);
            setHabits(MOCK_HABITS);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/game/habits', { title, difficulty });
            setTitle('');
            setIsCreating(false);
            fetchHabits();
        } catch (err) {
            setHabits([...habits, {
                id: Date.now(),
                title,
                difficulty,
                streak: 0,
                is_active: true,
                last_completed_date: null
            }]);
            setIsCreating(false);
        }
    };

    const completeHabit = async (id) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            await axios.post(`/api/game/habits/${id}/complete`);
            fetchHabits();
        } catch (err) {
            setHabits(habits.map(h => h.id === id ? { ...h, streak: h.streak + 1, last_completed_date: today } : h));
        }
    };

    const activeHabits = habits.filter(h => h.is_active);
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="relative h-full">
            <div className="flex justify-between items-center mb-8">
                <h1>Daily Protocols</h1>
                <Button onClick={() => setIsCreating(true)} variant="primary">
                    <Plus size={18} />
                    New Protocol
                </Button>
            </div>

            <div className="grid-12" style={{ alignContent: 'start' }}>
                <AnimatePresence>
                    {activeHabits.map(habit => {
                        const isDone = habit.last_completed_date === today;
                        return (
                            <motion.div
                                key={habit.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="col-span-4 glass-card flex flex-col justify-between hover:border-active transition-all"
                                style={{
                                    minHeight: 180,
                                    borderColor: isDone ? 'rgba(82, 196, 26, 0.4)' : undefined,
                                    background: isDone ? 'rgba(82, 196, 26, 0.05)' : undefined
                                }}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-semibold">{habit.title}</h3>
                                        <span className="badge badge-difficulty">{habit.difficulty}</span>
                                    </div>
                                    <div className="flex items-center gap-xs text-secondary mt-2">
                                        <Flame size={16} className={habit.streak > 0 ? 'text-hp' : 'text-muted'} />
                                        <span className={habit.streak > 0 ? 'text-light' : ''}>{habit.streak} Day Streak</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => !isDone && completeHabit(habit.id)}
                                    disabled={isDone}
                                    variant={isDone ? 'default' : 'primary'}
                                    className="w-full mt-4"
                                >
                                    {isDone ? (
                                        <>
                                            <Check size={16} /> Completed
                                        </>
                                    ) : 'Check In'}
                                </Button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Create Habit Modal (using simple overlay for now or reuse slide-over style if preferred) */}
                {/* Let's use a centered glass modal for variety or consistency? Plan said slide-over for TASKS. 
                    Actually, consistency is better. Let's use a small centered modal for habits as they are simpler. */}
            </div>

            <AnimatePresence>
                {isCreating && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="overlay"
                            onClick={() => setIsCreating(false)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="glass-card"
                                style={{ width: 400 }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3>Establish Protocol</h3>
                                    <button onClick={() => setIsCreating(false)} className="btn-icon"><X size={20} /></button>
                                </div>

                                <form onSubmit={handleCreate} className="flex flex-col gap-md">
                                    <input
                                        className="input"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Protocol Name"
                                        autoFocus
                                        required
                                    />
                                    <select
                                        className="input"
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value)}
                                    >
                                        {Object.keys(DIFFICULTY).map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <Button type="submit" variant="primary" className="mt-4">Confirm</Button>
                                </form>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
