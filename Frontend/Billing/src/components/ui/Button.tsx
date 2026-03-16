import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';

/**
 * Primary Button component that uses theme colors
 */
export function PrimaryButton({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  type = 'button',
  ...props 
}) {
  const { buttonColor, buttonHoverColor } = useThemeColors();
  const [isHovered, setIsHovered] = React.useState(false);

  const baseClasses = `
    flex items-center gap-2
    px-4 py-2
    text-sm font-medium
    text-white
    rounded-lg
    shadow-md
    transition-all duration-200
    cursor-pointer outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `;

  const style = {
    backgroundColor: isHovered && !disabled ? buttonHoverColor : buttonColor,
    ...props.style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Secondary Button component
 */
export function SecondaryButton({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  type = 'button',
  ...props 
}) {
  const baseClasses = `
    flex items-center gap-2
    px-4 py-2
    text-sm font-medium
    bg-white
    border border-gray-300
    text-gray-700
    rounded-lg
    transition-all duration-200
    cursor-pointer outline-none
    hover:bg-gray-50
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      {...props}
    >
      {children}
    </button>
  );
}
