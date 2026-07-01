import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileNav } from "@/components/shared/MobileNav";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { ShellExtras } from "@/components/shared/ShellExtras";
import { getUserPreferences } from "@/lib/actions/settings";

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/signin`);
  const prefs = await getUserPreferences();

  return (
    <div className="flex app-height overflow-hidden bg-background">
      <ShellExtras onboarded={prefs?.onboarded ?? false} />
      <Sidebar user={session.user} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 md:pb-0 pb-nav">
        {children}
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
