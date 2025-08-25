import React from 'react';

const OverviewWidget = ({ title, count, icon, color }) => {
    // Generate dynamic classes based on color prop
    const getColorClasses = () => {
        switch (color) {
            case 'green':
                return {
                    bg: 'from-green-500/80 to-emerald-700/80',
                    glow: 'group-hover:shadow-green-500/40',
                    border: 'border-green-500/30',
                    iconBg: 'bg-green-500/30',
                    hoverGradient: 'from-green-600 to-emerald-600',
                    text: 'text-green-100',
                    iconColor: 'text-green-400'
                };
            case 'red':
                return {
                    bg: 'from-red-500/80 to-rose-700/80',
                    glow: 'group-hover:shadow-red-500/40',
                    border: 'border-red-500/30',
                    iconBg: 'bg-red-500/30',
                    hoverGradient: 'from-red-600 to-rose-600',
                    text: 'text-red-100',
                    iconColor: 'text-red-400'
                };
            case 'blue':
                return {
                    bg: 'from-blue-500/80 to-indigo-700/80',
                    glow: 'group-hover:shadow-blue-500/40',
                    border: 'border-blue-500/30',
                    iconBg: 'bg-blue-500/30',
                    hoverGradient: 'from-blue-600 to-indigo-600',
                    text: 'text-blue-100',
                    iconColor: 'text-blue-400'
                };
            case 'amber':
                return {
                    bg: 'from-amber-500/80 to-orange-700/80',
                    glow: 'group-hover:shadow-amber-500/40',
                    border: 'border-amber-500/30',
                    iconBg: 'bg-amber-500/30',
                    hoverGradient: 'from-amber-600 to-orange-600',
                    text: 'text-amber-100',
                    iconColor: 'text-amber-400'
                };
            default:
                return {
                    bg: 'from-gray-500/80 to-gray-700/80',
                    glow: 'group-hover:shadow-gray-500/40',
                    border: 'border-gray-500/30',
                    iconBg: 'bg-gray-500/30',
                    hoverGradient: 'from-gray-600 to-gray-600',
                    text: 'text-gray-100',
                    iconColor: 'text-gray-400'
                };
        }
    };

    const colorClasses = getColorClasses();

    return (
        <div className={`bg-gradient-to-br ${colorClasses.bg} backdrop-blur-lg rounded-xl p-6 shadow-custom border ${colorClasses.border} relative overflow-hidden group hover:shadow-lg ${colorClasses.glow} transition-all duration-300`}>
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${colorClasses.hoverGradient} rounded-xl opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500`}></div>
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h3 className={`text-sm font-medium ${colorClasses.text}`}>{title}</h3>
                    <p className="text-3xl font-bold text-white mt-1">{count}</p>
                </div>
                <div className={`${colorClasses.iconBg} p-3 rounded-full h-12 w-12 flex items-center justify-center ${colorClasses.iconColor}`}>
                    <i className={`fas ${icon} text-xl`}></i>
                </div>
            </div>
        </div>
    );
};

export default OverviewWidget;
