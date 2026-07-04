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
    <div className="min-h-dvh bg-slate-50">
      <AdminNav user={user} />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
