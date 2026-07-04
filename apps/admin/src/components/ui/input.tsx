import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const base =
  'block w-full rounded-lg border border-surface-border bg-white px-4 text-base text-ink ' +
  'placeholder:text-ink-subtle focus-visible:border-primary focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-primary/25 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-soft';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(base, 'min-h-touch', className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(base, 'min-h-[6rem] py-3', className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(base, 'min-h-touch pr-10', className)}>
      {children}
    </select>
  );
}
