import { redirect } from 'next/navigation';
import { getUser } from '@eaupourtous/db/get-user';
import { AdminSidebar } from '@/components/admin-sidebar';

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
    <div className="min-h-dvh bg-surface-muted lg:flex">
      <AdminSidebar user={user} />
      <main id="main" className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
