import { useRouter } from 'next/navigation'
import MenuIcon from '@/components/icons/Menu'
import DropDownMenu, { DropDownMenuButton, DropDownMenuItem, DropDownMenuList } from '@/components/DropDownMenu'

export default function GlobalMenu() {
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
    <DropDownMenu>
      <DropDownMenuButton>
        <div className="flex items-center gap-2">
          <MenuIcon fill="var(--main-color)" />
        </div>
      </DropDownMenuButton>
      <DropDownMenuList align='right'>
        <DropDownMenuItem onClick={() => null}>
          Settings
        </DropDownMenuItem>
        <DropDownMenuItem onClick={() => handleLogout()}>
          Logout
        </DropDownMenuItem>
      </DropDownMenuList>
    </DropDownMenu>
  );
}
