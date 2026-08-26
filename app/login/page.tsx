import { redirect } from 'next/navigation'

/** Alias for /auth/login (used in docs and external links). */
export default function LoginAliasPage() {
  redirect('/auth/login')
}
