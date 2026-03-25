/**
 * Componente de Card reutilizável
 * Elimina duplicação de código de estilo
 */

import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  padding?: 'small' | 'medium' | 'large';
}

export function Card({
  title,
  subtitle,
  children,
  className = '',
  padding = 'medium',
}: CardProps) {
  const paddingClass = {
    small: 'p-3 sm:p-4',
    medium: 'p-6',
    large: 'p-8',
  }[padding];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${paddingClass} ${className}`}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
