import { EB_Garamond } from 'next/font/google'

const ebGaramond = EB_Garamond({
  variable: '--font-eb-garamond-serif',
  subsets: ['latin'],
});

export default function Home() {
  return (
    <div className='homeGrid'>
      <div className={`flex flex-col items-center justify-center row-start-[content-start] col-start-[content-start]`}>
        <div className={`text-7xl ${ebGaramond.className} mb-6 text-(--main-color)`}>Guage</div>
        <div className='flex flex-col gap-2 items-center'>
          <div>
            <div>email</div>
            <input type='text' className="border border-(--sub-color) rounded" />
          </div>
          <div>
            <div>password</div>
            <input type='password' className="border border-(--sub-color) rounded" />
          </div>
          <div className='bg-(--main-color) text-(--bg-color) rounded px-2 py-1'>login</div>
        </div>
      </div>
    </div>
  )
}
