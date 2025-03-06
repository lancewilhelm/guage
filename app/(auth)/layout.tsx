import Header from '@/components/Header'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="pageGrid">
      <Header />
      <div className='row-start-[content-start] col-start-[content-start]'>
        {children}
      </div>
    </div>
  )
}
