import { auth } from '@/lib/auth/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();

  if (session?.user) {
    return (
      <div className="flex flex-col gap-2 min-h-screen items-center justify-center bg-gray-900 text-white">
        <h1 className="mb-4 text-4xl">Logged in as <span className="font-bold">{session.user.name}</span></h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-h-screen items-center justify-center bg-gray-900 text-white">
      <h1 className="mb-4 text-4xl font-bold">Not logged in</h1>
      <div className="flex gap-4">
        <Link href="/auth/sign-up" className="text-indigo-400 hover:underline">Sign up</Link>
        <Link href="/auth/sign-in" className="text-indigo-400 hover:underline">Sign in</Link>
      </div>
    </div>
  );
}
