import { redirect } from 'next/navigation';

export default function AuthenticationRedirect() {
  redirect('/docs/api/authentication');
}
