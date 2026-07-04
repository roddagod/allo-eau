import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const base =
  'block w-full rounded-xl border border-slate-300 bg-white px-4 text-base ' +
  'placeholder:text-slate-400 focus-visible:border-gabon-green focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-gabon-green/30 ' +
  'aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-100';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(base, 'h-11', className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(base, 'min-h-[6rem] py-3', className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(base, 'h-11 pr-10', className)}>
      {children}
    </select>
  );
}
