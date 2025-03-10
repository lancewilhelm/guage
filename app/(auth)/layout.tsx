import Header from '@/components/Header'
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
    <div className="grid grid-rows-[auto_1fr] h-dvh overflow-hidden">
      <Header />
      <div className='h-full overflow-y-auto'>
        {children}
      </div>
    </div>
  )
}
