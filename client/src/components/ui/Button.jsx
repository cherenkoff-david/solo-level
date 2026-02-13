import React from 'react';

export default function Button({
    children,
    onClick,
    variant = 'default',
    type = 'button',
    disabled = false,
    className = '',
    style = {},
    ...props
}) {
    const variantClass = variant === 'primary' ? 'btn-primary'
        : variant === 'danger' ? 'btn-danger'
            : '';

    return (
        <button
            type={type}
            className={`btn ${variantClass} ${className}`}
            onClick={onClick}
            disabled={disabled}
            style={style}
            {...props}
        >
            {children}
        </button>
    );
}
