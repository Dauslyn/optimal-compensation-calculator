/**
 * Loading Spinner Component
 *
 * Displays a loading indicator during calculations.
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizeClasses[size]} animate-spin`}
        style={{
          border: '3px solid var(--border-default)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
        }}
      />
      {text && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * Skeleton Loading Component
 *
 * Placeholder while content is loading.
 */
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{
        width,
        height,
        background: 'var(--bg-elevated)',
      }}
    />
  );
}

/**
 * Card Skeleton for loading states
 */
export function CardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <Skeleton width="40%" height="1.5rem" />
      <div className="space-y-2">
        <Skeleton height="1rem" />
        <Skeleton height="1rem" />
        <Skeleton width="60%" height="1rem" />
      </div>
    </div>
  );
}
