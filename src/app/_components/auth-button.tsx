"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function AuthButton({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <button
        className="p-2 text-muted-foreground transition-colors hover:text-foreground"
        onClick={async () => {
          await signOut();
          window.location.href = "/";
        }}
        title="Sign out"
        type="button"
      >
        <LogOut className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
      onClick={async () => {
        await signOut();
        window.location.href = "/";
      }}
      type="button"
    >
      Sign out
    </button>
  );
}
