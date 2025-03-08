import Header from '@/components/Header'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid grid-rows-[auto_1fr] h-dvh overflow-hidden">
      <Header />
      <div className='h-full overflow-y-auto'>
        {children}
      </div>
    </div>
  )
}
