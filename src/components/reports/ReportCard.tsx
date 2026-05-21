import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

type ReportCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  isLoading?: boolean;
};

export function ReportCard({ title, description, children, isLoading }: ReportCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
