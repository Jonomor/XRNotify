// =============================================================================
// XRNotify Dashboard - Layout
// =============================================================================
// Wraps all dashboard pages with the persistent sidebar navigation
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import Nav from '@/components/Nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <Nav user={{ name: session.name ?? null, email: session.email }}>
      {children}
    </Nav>
  );
}
