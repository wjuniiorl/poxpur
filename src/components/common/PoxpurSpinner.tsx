import { cn } from '@/lib/utils';
import { PoxpurLogo } from './PoxpurLogo';

type PoxpurSpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullscreen?: boolean;
  label?: string;
  className?: string;
};

export function PoxpurSpinner({
  size = 'md',
  fullscreen = false,
  label,
  className,
}: PoxpurSpinnerProps) {
  const content = (
    <div className={cn('inline-flex flex-col items-center gap-3', className)}>
      <div className="animate-spin">
        <PoxpurLogo variant="mark" size={size} />
      </div>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background">
        {content}
      </div>
    );
  }

  return content;
}
