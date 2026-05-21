import { cn } from '@/lib/utils';

type PoxpurLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark';
  className?: string;
  /** True quando renderizada sobre fundo navy (sidebar) — wordmark fica branca */
  inverted?: boolean;
};

const sizeMap = {
  sm: { wordmark: 'text-base', mark: 'h-5 w-5' },
  md: { wordmark: 'text-xl', mark: 'h-7 w-7' },
  lg: { wordmark: 'text-3xl', mark: 'h-10 w-10' },
  xl: { wordmark: 'text-5xl', mark: 'h-16 w-16' },
};

export function PoxpurLogo({
  size = 'md',
  variant = 'full',
  className,
  inverted = false,
}: PoxpurLogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 32 32"
        className={cn(sizeMap[size].mark, 'shrink-0', className)}
        aria-label="Poxpur"
        role="img"
      >
        <rect width="32" height="32" rx="6" fill="hsl(var(--poxpur-green))" />
        <path
          d="M 9 9 L 23 23 M 23 9 L 9 23"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 font-bold tracking-tight',
        sizeMap[size].wordmark,
        inverted ? 'text-white' : 'text-poxpur-navy',
        className,
      )}
      aria-label="Poxpur Sales Hub"
    >
      <span>POX</span>
      <svg
        viewBox="0 0 32 32"
        className={cn(sizeMap[size].mark, 'shrink-0')}
        aria-hidden
      >
        <rect width="32" height="32" rx="6" fill="hsl(var(--poxpur-green))" />
        <path
          d="M 9 9 L 23 23 M 23 9 L 9 23"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <span>PUR</span>
    </div>
  );
}
