import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    ListTodo,
    Repeat,
    TrendingUp,
    Settings,
    Sword,
    User,
    LogOut,
    Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRef } from 'react';
import BackgroundElements from './BackgroundElements';
import versionData from '../version.json';

const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/tasks', label: 'Missions', icon: ListTodo },
    { path: '/habits', label: 'Protocols', icon: Repeat },
    { path: '/progress', label: 'Analysis', icon: TrendingUp },
    // { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
    const location = useLocation();
    const { logout, user, updateProfile } = useAuth();
    const fileInputRef = useRef(null);
    const [collapsed, setCollapsed] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            updateProfile({ avatarUrl: url });
        }
    };

    const avatarSrc = user?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";

    return (
        <div
            className={`layout-container relative ${collapsed ? 'collapsed' : ''}`}
            style={{ '--sidebar-width': collapsed ? '80px' : '260px' }}
        >
            <BackgroundElements />
            {/* ── Sidebar ── */}
            <aside className="sidebar">
                {/* Resize Handle */}
                <div
                    className="resize-handle"
                    onDoubleClick={() => setCollapsed(!collapsed)}
                    title="Double click to toggle sidebar"
                />

                <div className="sidebar-header">
                    <div
                        className="avatar-lg group relative cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <img src={avatarSrc} alt="User" />
                        <div className="avatar-overlay">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-8 h-8 text-white"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                <path d="M12 12 2.1 10.5M12 12 10.5 21.9M12 12l9.9 1.5M12 12l1.5-9.9" />
                                <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.2)" stroke="none" />
                            </svg>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user?.name || 'Jinwoo'}</span>
                        <span className="user-rank">S-Rank Hunter</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-group-label">Menu</div>
                    {navItems.map(({ path, label, icon: Icon }) => {
                        const isActive = location.pathname === path;
                        return (
                            <Link
                                key={path}
                                to={path}
                                className={`nav-link ${isActive ? 'active' : ''}`}
                                title={collapsed ? label : ''}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="nav-text">{label}</span>
                                {isActive && <motion.div layoutId="active-indicator" className="active-dot" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={logout} className="nav-link logout" title={collapsed ? 'Log Out' : ''}>
                        <LogOut size={20} />
                        <span className="nav-text">Log Out</span>
                    </button>
                    <Link to="/settings" className="nav-link" title={collapsed ? 'Settings' : ''}>
                        <Settings size={20} />
                        <span className="nav-text">Settings</span>
                    </Link>
                    <a
                        href="https://github.com/cherenkoff-david/solo-level"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="version-text text-xs text-secondary opacity-50 mt-1 font-mono hover:opacity-100 transition-opacity block"
                        style={{ paddingLeft: 52 }}
                    >
                        version {versionData.version}
                    </a>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="main-content">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="content-inner"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            <style>{`
                .layout-container {
                    display: flex;
                    min-height: 100vh;
                    /* Transition for CSS variables is not possible directly, but we transition the properties using the variable */
                }

                /* Sidebar */
                .sidebar {
                    width: var(--sidebar-width);
                    height: 100vh;
                    position: fixed;
                    left: 0;
                    top: 0;
                    padding: 40px 24px;
                    display: flex;
                    flex-direction: column;
                    background: rgba(20, 20, 20, 0.4);
                    backdrop-filter: blur(20px);
                    border-right: 1px solid rgba(255,255,255,0.03);
                    z-index: 100;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease;
                    overflow: hidden; /* Hide overflow content during collapse */
                }
                
                /* Collapsed State Overrides */
                .collapsed .sidebar {
                    padding: 40px 12px; /* Reduce padding to center icons */
                    align-items: center;
                }

                .collapsed .nav-text,
                .collapsed .user-info,
                .collapsed .nav-group-label,
                .collapsed .version-text {
                    display: none;
                }

                .collapsed .avatar-lg {
                    width: 48px;
                    height: 48px;
                    margin-bottom: 24px;
                }

                .collapsed .nav-link {
                    justify-content: center;
                    padding: 14px 0; /* Center icons */
                    width: 100%;
                }

                .collapsed .active-dot {
                    right: 8px; /* Adjust dot position */
                }
                
                .collapsed .sidebar-header {
                    padding-left: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 20px;
                }

                /* Resize Handle */
                .resize-handle {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    width: 10px; /* Clickable width */
                    cursor: col-resize;
                    z-index: 10;
                    transition: background 0.2s;
                }
                
                .resize-handle:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .sidebar-header {
                    margin-bottom: 40px;
                    padding-left: 12px;
                    transition: all 0.3s ease;
                }

                .avatar-lg {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    overflow: hidden;
                    margin-bottom: 16px;
                    border: 2px solid rgba(255,255,255,0.1);
                    transition: all 0.3s ease;
                }

                .avatar-lg:hover .avatar-overlay {
                    opacity: 1;
                }
                
                .avatar-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s;
                    border-radius: 50%;
                    backdrop-filter: blur(4px);
                    color: white;
                }
                
                .avatar-overlay span {
                    letter-spacing: 0.1em;
                }

                .avatar-lg img { width: 100%; height: 100%; object-fit: cover; }

                .user-name { display: block; font-size: 20px; font-weight: 700; white-space: nowrap; }
                .user-rank { display: block; font-size: 13px; color: var(--text-secondary); margin-top: 4px; white-space: nowrap; }

                .nav-group-label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--text-muted);
                    margin-bottom: 16px;
                    padding-left: 12px;
                    white-space: nowrap;
                }

                .sidebar-nav {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 14px 16px;
                    border-radius: 16px;
                    color: var(--text-secondary);
                    font-size: 15px;
                    font-weight: 500;
                    transition: all 0.2s;
                    position: relative;
                    white-space: nowrap; /* Prevent text wrap during collapse */
                }

                .nav-link:hover {
                    background: rgba(255,255,255,0.05);
                    color: var(--text-primary);
                }

                .nav-link.active {
                    color: var(--text-primary);
                    background: rgba(255,255,255,0.08);
                    font-weight: 600;
                }
                
                .active-dot {
                    position: absolute;
                    right: 16px;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--text-primary);
                }

                .sidebar-footer {
                    margin-top: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    padding-top: 20px;
                    width: 100%;
                }
                
                .nav-link.logout {
                    border: none;
                    background: transparent;
                    width: 100%;
                    cursor: pointer;
                }
                
                .nav-link.logout:hover {
                    color: var(--accent-hp);
                    background: rgba(255, 77, 79, 0.1);
                }

                /* Main */
                .main-content {
                    flex: 1;
                    margin-left: var(--sidebar-width);
                    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .content-inner {
                    padding: 40px 60px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
            `}</style>
        </div>
    );
}
