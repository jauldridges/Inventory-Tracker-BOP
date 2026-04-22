import { redirect } from "next/navigation";
import { signIn, isSignedIn } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const ok = await signIn(password);
  if (ok) {
    redirect("/");
  }
  redirect("/login?error=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isSignedIn()) redirect("/");
  const params = await searchParams;

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 p-6">
      <form
        action={loginAction}
        className="w-full max-w-sm bg-white p-6 rounded-lg shadow-sm border space-y-4"
      >
        <h1 className="text-xl font-semibold">Inventory Tracker</h1>
        <p className="text-sm text-neutral-600">Sign in to continue.</p>
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full border rounded px-3 py-2"
          autoFocus
        />
        {params.error ? (
          <p className="text-sm text-red-600">Wrong password.</p>
        ) : null}
        <button
          type="submit"
          className="w-full bg-black text-white rounded px-3 py-2 hover:bg-neutral-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
