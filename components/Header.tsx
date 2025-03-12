'use client'
import { useRouter } from 'next/navigation'
import ModeMenu from '@/components/ModeMenu'

export default function Header() {
  const router = useRouter()
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
    <div className='flex py-2 px-4 items-center gap-4 border-b'>
      <ModeMenu />
      <div className="grow" />
      <div className="flex gap-4">
        <div className="cursor-pointer">settings</div>
        <div className="cursor-pointer" onClick={handleLogout}>logout</div>
      </div>
    </div >
  )
}
