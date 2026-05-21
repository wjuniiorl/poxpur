import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfDay,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarDays, ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Period = {
  from: Date;
  to: Date;
  label: string;
};

type PeriodPickerProps = {
  value: Period;
  onChange: (p: Period) => void;
};

// ─── Presets ──────────────────────────────────────────────────────────────────

function buildPresets(): Period[] {
  const now = new Date();
  return [
    { from: subDays(now, 7), to: endOfDay(now), label: 'Últimos 7 dias' },
    { from: subDays(now, 30), to: endOfDay(now), label: 'Últimos 30 dias' },
    { from: startOfMonth(now), to: endOfDay(now), label: 'Este mês' },
    {
      from: startOfMonth(subMonths(now, 1)),
      to: endOfMonth(subMonths(now, 1)),
      label: 'Mês passado',
    },
    { from: startOfYear(now), to: endOfDay(now), label: 'Este ano' },
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const presets = buildPresets();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {value.label}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {presets.map((p) => (
          <DropdownMenuItem
            key={p.label}
            onClick={() => onChange(p)}
            className={value.label === p.label ? 'font-medium' : ''}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Default period ───────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function defaultPeriod(): Period {
  const now = new Date();
  return { from: subDays(now, 30), to: endOfDay(now), label: 'Últimos 30 dias' };
}
