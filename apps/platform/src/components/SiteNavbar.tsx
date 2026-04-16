import { getCurrentSession } from '@/lib/auth/session';
import { Navbar } from './Navbar';

export async function SiteNavbar() {
  const session = await getCurrentSession();
  return <Navbar isAuthenticated={!!session} />;
}
