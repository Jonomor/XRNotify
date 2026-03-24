// =============================================================================
// XRNotify Dashboard - Layout
// =============================================================================
// Wraps all dashboard pages with the persistent sidebar navigation
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import { queryOne } from '@/lib/db';
import Nav from '@/components/Nav';

interface UserProfile {
  avatar_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch user's profile data from database
  let profile: UserProfile | null = null;
  try {
    profile = await queryOne<UserProfile>(`
      SELECT avatar_url, twitter_url, github_url, linkedin_url, website_url
      FROM users WHERE email = $1
    `, [session.email]);
  } catch {
    // Profile columns may not exist if migration 009 hasn't run
  }

  return (
    <Nav user={{
      name: session.name ?? null,
      email: session.email,
      avatar_url: profile?.avatar_url ?? null,
      twitter_url: profile?.twitter_url ?? null,
      github_url: profile?.github_url ?? null,
      linkedin_url: profile?.linkedin_url ?? null,
      website_url: profile?.website_url ?? null,
    }}>
      {children}
    </Nav>
  );
}
