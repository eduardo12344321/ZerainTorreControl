import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost';
    color?: 'blue' | 'orange' | 'green' | 'red' | 'gray';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    color = 'gray',
    className = ''
}) => {
    const colorMap = {
        blue: 'bg-zerain-blue-light text-white border-zerain-blue',
        orange: 'bg-zerain-orange text-white border-orange-600',
        green: 'bg-zerain-green text-white border-green-600',
        red: 'bg-zerain-red text-white border-red-600',
        gray: 'bg-gray-200 text-gray-800 border-gray-300',
    };

    const baseStyles = 'px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center justify-center';
    const colorStyles = colorMap[color];

    return (
        <span className={`${baseStyles} ${colorStyles} ${className}`}>
            {children}
        </span>
    );
};
