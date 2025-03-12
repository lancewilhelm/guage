import { redirect } from 'next/navigation'
import { getSession } from '@/utils/auth'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  // check login status
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className='h-dvh overflow-hidden'>
      {children}
    </div>
  )
}
