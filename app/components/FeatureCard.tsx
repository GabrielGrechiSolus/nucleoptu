import React from 'react';

export const FeatureCard = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 p-5 hover:bg-zinc-800 transition-colors duration-200">
        <div className="flex items-center gap-2">
            <span className="text-xl text-sky-400">{icon}</span>
            <h3 className="text-lg font-semibold text-zinc-50">{title}</h3>
        </div>
        <p className="text-sm text-zinc-400">{description}</p>
    </div>
);