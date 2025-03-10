'use client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ebGaramond } from '@/utils/fonts'

const navLinks = [
  { name: 'chat', href: '/chat' },
  { name: 'role play', href: '/roleplay' },
]

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const handleLogout = async () => {
    const res = await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (res.ok) {
      router.push('/')
    } else {
      alert('Unable to logout')
    }
  }

  return (
    <div className="flex py-2 px-4 items-center gap-4 border-b">
      <Link href='/dashboard'>
        <div id="logo" className={`text-4xl text-(--main-color) ${ebGaramond.className} translate-y-[-3px]`}>Guage</div>
      </Link>
      <div className="flex gap-4">
        {navLinks.map((link) => (
          <Link href={link.href} key={link.name} className={link.href === pathname ? 'underline' : ''}>{link.name}</Link>
        ))}
      </div>
      <div className="grow" />
      <div className="flex gap-4">
        <div className="cursor-pointer">settings</div>
        <div className="cursor-pointer" onClick={handleLogout}>logout</div>
      </div>
    </div >
  )
}
