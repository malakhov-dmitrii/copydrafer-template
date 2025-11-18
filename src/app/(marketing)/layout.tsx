import { headers } from "next/headers";
import Link from "next/link";
import { AuthButton } from "@/app/_components/auth-button";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link className="flex items-center space-x-2" href="/">
                <div className="h-8 w-8 rounded-lg bg-primary" />
                <span className="font-bold text-foreground text-xl">
                  Copydrafer
                </span>
              </Link>
              <div className="ml-10 hidden md:block">
                <div className="flex items-baseline space-x-4">
                  <Button asChild variant="ghost">
                    <Link href="/">Home</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/features">Features</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/pricing">Pricing</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/about">About</Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <Button asChild variant="ghost">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <AuthButton />
                </>
              ) : (
                <>
                  <Button asChild variant="ghost">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/sign-up">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="mt-24 border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-primary" />
                <span className="font-bold text-foreground text-xl">
                  Copydrafer
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                Building the future of content creation with AI-powered tools.
              </p>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-foreground">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/features">Features</Link>
                  </Button>
                </li>
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/pricing">Pricing</Link>
                  </Button>
                </li>
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/roadmap">Roadmap</Link>
                  </Button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-foreground">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/about">About</Link>
                  </Button>
                </li>
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/blog">Blog</Link>
                  </Button>
                </li>
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/contact">Contact</Link>
                  </Button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-foreground">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/privacy">Privacy</Link>
                  </Button>
                </li>
                <li>
                  <Button asChild className="h-auto p-0" variant="link">
                    <Link href="/terms">Terms</Link>
                  </Button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8">
            <p className="text-center text-muted-foreground text-sm">
              © 2024 Copydrafer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
