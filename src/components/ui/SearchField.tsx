import React from 'react';

interface SearchFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  leadingIcon?: React.ReactNode;
  'aria-label'?: string;
}

/** Text search with an Add-button-colored circular clear chip on the right. */
export default function SearchField({
  id,
  value,
  onChange,
  placeholder,
  className = '',
  inputClassName = '',
  leadingIcon,
  'aria-label': ariaLabel,
}: SearchFieldProps) {
  const hasValue = value.trim().length > 0;
  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      {leadingIcon}
      <input
        id={id}
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
        style={hasValue ? { paddingRight: '2.4rem' } : undefined}
      />
      {hasValue && (
        <button
          type="button"
          className="search-clear"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
    </div>
  );
}
