import React, { useState, useEffect } from 'react';
import {
    Globe,
    Shield,
    Smartphone,
    Check,
    ChevronRight,
    Bell,
    CreditCard // Trigger version bump
} from 'lucide-react';
import Button from '../components/ui/Button';

export default function SettingsPage() {
    const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'en');

    useEffect(() => {
        localStorage.setItem('app_language', language);
    }, [language]);

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        // In a real app, this would trigger i18n context update
        console.log(`Language changed to: ${lang} `);
    };

    return (
        <div className="grid-12">
            <div className="col-span-12 mb-6">
                <h1>Settings</h1>
                <p className="text-secondary">Manage system configurations and preferences.</p>
            </div>

            {/* General Settings */}
            <div className="col-span-8 glass-card">
                <h3 className="mb-6 flex items-center gap-md">
                    <Globe size={20} className="text-primary" />
                    General
                </h3>

                <div className="flex flex-col gap-lg">
                    {/* Language Selection */}
                    <div className="p-4 rounded-xl bg-white/5">
                        <div className="font-semibold mb-4">System Language</div>
                        <div className="flex flex-col gap-4">
                            {[
                                { code: 'en', label: 'English', flag: '🇬🇧' },
                                { code: 'ru', label: 'Русский', flag: '🇷🇺' }
                            ].map((option) => (
                                <label
                                    key={option.code}
                                    className="flex items-center gap-4 cursor-pointer group"
                                    onClick={() => handleLanguageChange(option.code)}
                                >
                                    {/* Custom Radio Button */}
                                    <div className={`relative w - 6 h - 6 rounded - full border - 2 flex items - center justify - center transition - colors ${language === option.code
                                            ? 'border-primary'
                                            : 'border-white/20 group-hover:border-white/50'
                                        } `}
                                    >
                                        {language === option.code && (
                                            <div className="w-3 h-3 rounded-full bg-primary" />
                                        )}
                                    </div>

                                    {/* Label Content */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl leading-none">{option.flag}</span>
                                        <span className={`text - lg ${language === option.code ? 'text-white font-medium' : 'text-secondary'} `}>
                                            {option.label}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Placeholder for other settings to make it look complete */}
                    <div className="flex justify-between items-center p-4 rounded-xl border border-dashed border-white/10 opacity-50">
                        <div>
                            <div className="font-semibold mb-1">Interface Theme</div>
                            <div className="text-secondary text-xs">Customize system appearance</div>
                        </div>
                        <div className="text-xs text-muted uppercase">Locked</div>
                    </div>
                </div>
            </div>

            {/* Side Panel / Info */}
            <div className="col-span-4 flex flex-col gap-lg">
                <div className="glass-card">
                    <h3 className="mb-4 flex items-center gap-md">
                        <Shield size={20} className="text-primary" />
                        Account Status
                    </h3>
                    <div className="flex items-center gap-md mb-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <Check size={24} />
                        </div>
                        <div>
                            <div className="font-bold">System Active</div>
                            <div className="text-xs text-secondary">No issues detected</div>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full">Manage Subscription</Button>
                </div>
            </div>
        </div>
    );
}
