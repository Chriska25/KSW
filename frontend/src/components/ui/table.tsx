import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="responsive-table-wrap w-full">
      <table className={cn('w-full text-left text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-surface-muted border-b border-border', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('hover:bg-surface-muted/50 transition-colors', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'py-3 px-4 text-caption font-semibold uppercase text-muted-foreground whitespace-nowrap',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('py-3 px-4 align-middle', className)} {...props} />;
}

export function TableEmpty({ colSpan, message = 'Aucune donnée.' }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 px-4 text-center text-small text-muted-foreground">
        {message}
      </td>
    </tr>
  );
}
