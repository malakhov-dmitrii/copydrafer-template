import {
  BarChart3,
  FileText,
  Home,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthButton } from "@/app/_components/auth-button";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/sign-in");
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Content", href: "/dashboard/content", icon: FileText },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Team", href: "/dashboard/team", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link className="flex items-center space-x-2 p-2" href="/dashboard">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="font-bold text-sidebar-foreground text-xl">
              Copydrafer
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* AI Assistant Section */}
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="mx-2 rounded-lg border bg-muted/50 p-4">
                <div className="mb-2 flex items-center">
                  <Sparkles className="mr-2 h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground text-sm">
                    AI Assistant
                  </span>
                </div>
                <p className="mb-3 text-muted-foreground text-xs">
                  Get help writing content with our AI-powered assistant.
                </p>
                <Button className="w-full" size="sm">
                  Start Writing
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-sm">
                {session.user.name?.[0] || session.user.email?.[0] || "U"}
              </div>
              <div className="ml-3">
                <p className="font-medium text-sidebar-foreground text-sm">
                  {session.user.name || "User"}
                </p>
                <p className="max-w-[120px] truncate text-muted-foreground text-xs">
                  {session.user.email}
                </p>
              </div>
            </div>
            <AuthButton variant="compact" />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="font-semibold text-2xl text-foreground">
              Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <Button>New Content</Button>
            </div>
          </div>
        </header>
        {/* Page Content */}
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
