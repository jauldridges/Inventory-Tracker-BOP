import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { isSignedIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inventory Tracker",
  description: "Track cups, lids, and other consumables for a Square-powered shop.",
};

async function signOutAction() {
  "use server";
  await signOut();
  redirect("/login");
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isSignedIn();

  return (
    <html lang="en">
      <body className="antialiased">
        {authed ? (
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-white">
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Link href="/" className="font-semibold">
                    Inventory Tracker
                  </Link>
                  <nav className="flex gap-4 text-sm text-neutral-700">
                    <Link href="/">Overview</Link>
                    <Link href="/inventory">Inventory</Link>
                    <Link href="/recipes">Recipes</Link>
                    <Link href="/settings">Settings</Link>
                  </nav>
                </div>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-sm text-neutral-600 hover:text-neutral-900"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </header>
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
