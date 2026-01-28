import React from 'react';
import { cn } from '../../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:pointer-events-none',
                    {
                        'bg-gradient-to-r from-indigo-600 via-purple-500 to-fuchsia-500 text-white shadow-sm hover:shadow-md hover:brightness-105': variant === 'primary',
                        'bg-white text-gray-900 border border-orange-100 shadow-sm hover:bg-orange-50': variant === 'secondary',
                        'border border-rose-500 text-rose-600 hover:bg-rose-50': variant === 'outline',
                        'text-gray-700 hover:bg-orange-50': variant === 'ghost',
                        'bg-red-500 text-white shadow-sm hover:bg-red-600': variant === 'danger',
                        'px-3 py-1.5 text-sm': size === 'sm',
                        'px-4 py-2 text-base': size === 'md',
                        'px-6 py-3 text-lg': size === 'lg',
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
