import { signOut } from '@/app/auth/sign-out/actions';

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="border border-white/20 px-4 py-2 rounded hover:bg-white/5 text-sm"
      >
        Logout
      </button>
    </form>
  );
}
