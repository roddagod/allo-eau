import { redirect } from 'next/navigation';
import { getUser } from '@eaupourtous/db/get-user';
import { AppNav } from '@/components/app-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) redirect('/login');
  if (user.profile.status !== 'active') redirect('/login?error=account_suspended');

  return (
    <div className="min-h-dvh bg-surface-muted">
      <AppNav user={user} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
