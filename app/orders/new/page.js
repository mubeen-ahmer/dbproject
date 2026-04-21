import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Link from 'next/link';
import NewOrderForm from './NewOrderForm';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (user.role !== 'student') redirect('/');

  const [subjectsRes, servicesRes] = await Promise.all([
    pool.query('SELECT uuid, name FROM subject ORDER BY name'),
    pool.query(
      'SELECT uuid, name, price_of_first_page, price_of_additional_page FROM service ORDER BY name'
    ),
  ]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href="/dashboard/student" className="text-indigo-400 hover:underline text-sm">
        ← Dashboard
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-6">New Order</h1>

      <NewOrderForm subjects={subjectsRes.rows} services={servicesRes.rows} />
    </div>
  );
}
