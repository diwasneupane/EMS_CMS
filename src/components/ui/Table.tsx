import React from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  keyExtractor?: (row: T) => string;
}

export function Table<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  emptyTitle = 'No Data',
  keyExtractor,
}: TableProps<T>) {
  const getNestedValue = (obj: T, accessor: string): unknown => {
    return accessor.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, rowIdx) => (
            <tr
              key={keyExtractor ? keyExtractor(row) : rowIdx}
              className="hover:bg-slate-50 transition-colors"
            >
              {columns.map((col, colIdx) => {
                const value = getNestedValue(row, col.accessor as string);
                return (
                  <td
                    key={colIdx}
                    className={cn('px-4 py-3 text-slate-700 whitespace-nowrap', col.className)}
                  >
                    {col.render ? col.render(value, row) : (value !== undefined && value !== null ? String(value) : '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
