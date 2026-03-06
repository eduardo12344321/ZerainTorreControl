import React from 'react';

interface AvatarProps {
    src?: string;
    alt?: string;
    fallback: string;
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({
    src,
    alt = 'Avatar',
    fallback,
    className = '',
    size = 'md'
}) => {
    const sizeClasses = {
        xs: 'w-6 h-6 text-[8px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base'
    };

    return (
        <div className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 ${sizeClasses[size]} ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback on error
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
            ) : null}
            <span className={`${src ? 'hidden' : ''} font-bold text-gray-500`}>
                {fallback ? fallback.substring(0, 2).toUpperCase() : '??'}
            </span>
        </div>
    );
};
