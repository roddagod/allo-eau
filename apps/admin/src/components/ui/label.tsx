import type { LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Label({
  className,
  required,
  children,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label {...rest} className={cn('mb-1.5 block text-sm font-medium text-ink-muted', className)}>
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}
