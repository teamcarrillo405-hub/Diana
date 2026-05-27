"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface NavProps {
  displayName: string
}

export default function Nav({ displayName }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const links = [
    { href: "/dashboard", label: "Home" },
    { href: "/classes", label: "Classes" },
  ]

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-stone-900 text-lg">Diana</span>
          <nav className="flex gap-4">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "text-stone-900"
                    : "text-stone-400 hover:text-stone-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500 hidden sm:block">{displayName}</span>
          <button
            onClick={signOut}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
