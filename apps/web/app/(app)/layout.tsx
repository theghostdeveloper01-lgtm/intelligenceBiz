import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/tenant";
import { signOut } from "./actions";

const NAV_ITEMS = [
  { href: "/inbox", label: "Inbox" },
  { href: "/connection", label: "WhatsApp Connection" },
  { href: "/analytics", label: "Analytics" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4">
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <form action={signOut}>
            <button type="submit" className="mt-2 text-xs text-slate-500 underline hover:text-slate-700">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
