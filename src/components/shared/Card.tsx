import React from 'react';
import { cn } from '../../utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'rounded-2xl border border-orange-50/80 bg-white shadow-sm',
                    {
                        'shadow-md shadow-orange-100/60': variant === 'default',
                        'bg-white/70 backdrop-blur-md shadow-lg': variant === 'glass',
                        'hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer hover:shadow-orange-200/60': variant === 'interactive',
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
