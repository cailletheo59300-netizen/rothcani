import { requireUser } from "@/lib/supabase/server";
import { Sidebar, BottomNav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return (
    <div className="flex min-h-dvh">
      <Sidebar email={user.email ?? ""} />
      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
