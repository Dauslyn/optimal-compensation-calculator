import { memo } from 'react';

/**
 * Props for InputField component
 */
export interface InputFieldProps {
    label: string;
    id: string;
    value: number | string;
    onChange: (value: string) => void;
    suffix?: string;
    prefix?: string;
    placeholder?: string;
    step?: string;
    hint?: string;
}

/**
 * Reusable input field with label, optional prefix/suffix, and hint text
 */
export const InputField = memo(function InputField({
    label,
    id,
    value,
    onChange,
    suffix,
    prefix,
    placeholder,
    step = "1",
    hint,
}: InputFieldProps) {
    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <div className="relative">
                {prefix && (
                    <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {prefix}
                    </span>
                )}
                <input
                    id={id}
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={prefix ? 'pl-8' : ''}
                    placeholder={placeholder}
                    step={step}
                />
                {suffix && (
                    <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {suffix}
                    </span>
                )}
            </div>
            {hint && <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>{hint}</p>}
        </div>
    );
});
