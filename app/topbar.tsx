'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, signOut } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function TopBar() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <nav className="topbar">
      <Link href={user ? '/' : '/login'} className="logo">
        Rendez<span>Vous</span>
      </Link>
      <div className="topbar-actions">
        {user ? (
          <>
            <Link href="/" className="btn btn-ghost btn-sm">📋 My Polls</Link>
            <Link href="/create" className="btn btn-primary btn-sm">+ New Poll</Link>
            <span className="topbar-user">{user.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Log out</button>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">Log in</Link>
        )}
      </div>
    </nav>
  )
}
