import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AngleDownIcon from '@/components/icons/AngleDown'

const routes = [
  { path: '/chat', label: 'Chat' },
  { path: '/roleplay', label: 'Role Play' },
]

export default function DropDownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter()
  const pathname = usePathname()
  const currentRoute = routes.find(route => route.path === pathname)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleRouteChange = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className='relative cursor-pointer'>
      <div
        className='flex items-center gap-2'
        onMouseDown={(e) => {
          e.preventDefault()
          setIsOpen(!isOpen)
        }}
      >
        {currentRoute ? currentRoute.label : 'Select a page'}
        <AngleDownIcon fill='var(--main-color)' />
      </div>
      {isOpen && (
        <div className='absolute bg-(--bg-color) mt-2 border rounded min-w-max'>
          {routes
            .filter(route => route.path !== pathname)
            .map((route, index) => (
              <div
                key={index}
                className='cursor-pointer p-2 hover:opacity-80 active:opacity-60'
                onClick={() => handleRouteChange(route.path)}
              >
                {route.label}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
