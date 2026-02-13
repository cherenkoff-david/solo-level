import React from 'react';

export default function BackgroundElements() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Top Left - Theme Blue */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#5B8CFF]/20 rounded-full blur-[120px] animate-pulse-slow"></div>

            {/* Bottom Right - Theme Red */}
            <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-[#FF4D4F]/15 rounded-full blur-[110px] animate-float"></div>

            {/* Center/Top - Subtle Purple to bridge */}
            <div className="absolute top-[20%] left-[40%] w-[40vw] h-[40vw] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-20px, 20px); }
                }
                .animate-float {
                    animation: float 10s ease-in-out infinite;
                }
                .animate-pulse-slow {
                    animation: pulse 8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
