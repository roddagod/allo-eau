import { PublicHeader } from '@/components/public-header';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-muted">
      <PublicHeader hideNav />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
