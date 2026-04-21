import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-4 min-h-screen items-center justify-center bg-gray-900 text-white">
        <h1 className="text-4xl font-bold">Welcome</h1>
        <div className="flex gap-4">
          <Link href="/auth/sign-up" className="text-indigo-400 hover:underline">Sign up</Link>
          <Link href="/auth/sign-in" className="text-indigo-400 hover:underline">Sign in</Link>
        </div>
      </div>
    );
  }

  if (user.role === 'admin')  redirect('/dashboard/admin');
  if (user.role === 'writer') redirect('/dashboard/writer');
  redirect('/dashboard/student');
}
