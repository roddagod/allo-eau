import { redirect } from 'next/navigation';
import { getUser } from '@eaupourtous/db/get-user';
import { AdminNav } from '@/components/admin-nav';

const ALLOWED_ROLES = [
  'admin',
  'super_admin',
  'supervisor',
  'company_owner',
  'company_operator',
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) redirect('/login');
  if (!ALLOWED_ROLES.includes(user.profile.role)) redirect('/login');
  if (user.profile.status !== 'active') redirect('/login');

  return (
    <div className="min-h-dvh bg-surface-muted">
      <AdminNav user={user} />
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
