'use client'
import { useState, useRef } from 'react'
import AngleRightIcon from '@/components/icons/AngleRight'
import AngleLeftIcon from '@/components/icons/AngleLeft'

interface SidePanelProps {
  children: React.ReactNode
}

export default function SidePanel({ children }: SidePanelProps) {
  const sidePanelMinWidth = 40
  const [sessionPanelWidth, setSessionPanelWidth] = useState(sidePanelMinWidth) // 0 for mobile, 1 for desktop
  const isResizing = useRef(false)
  const minWidth = 250
  const maxWidth = 600

  // Handle panel resizing
  const startResizing = () => {
    isResizing.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      resize(e);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      isResizing.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  // Resize the panel
  const resize = (event: MouseEvent) => {
    if (!isResizing.current) return;

    let width = 0;

    width = event.clientX;

    let newWidth = width;
    if (width < (minWidth / 2)) {
      newWidth = sidePanelMinWidth;
    } else {
      newWidth = Math.max(minWidth, Math.min(width, maxWidth));
    }
    setSessionPanelWidth(newWidth);
  };

  // Toggle the panel width
  const togglePanel = () => {
    setSessionPanelWidth(sessionPanelWidth === sidePanelMinWidth ? minWidth : sidePanelMinWidth)
  }

  return (
    <div className="flex h-full">
      <div
        className="flex justify-center p-2 overflow-hidden"
        style={{ width: sessionPanelWidth }}
      >
        {
          sessionPanelWidth < minWidth ?
            <div className='flex flex-col w-full items-center'>
              <div
                className='flex flex-col items-center mb-15 cursor-pointer'
                onMouseDown={() => togglePanel()}
              >
                <AngleRightIcon fill="var(--main-color)" />
                <div className='rotate-270 translate-y-full'>Sessions</div>
              </div>
            </div>
            :
            <div className='flex flex-col w-full items-center gap-2'>
              <div className="flex w-full">
                <div className='grow text-left'>
                  Sessions
                </div>
                <AngleLeftIcon
                  fill="var(--main-color)"
                  className="cursor-pointer"
                  onMouseDown={() => togglePanel()}
                />
              </div>
              {children}
            </div>
        }
      </div>
      <div
        className="flex cursor-ew-resize"
        onMouseDown={(e) => {
          e.preventDefault()
          startResizing()
        }}
      >
        {/* Some trickery to create a 1px border with a wide hover range*/}
        <div className="w-[2px] bg-(--bg-color)" />
        <div className="w-[1px] bg-(--main-color)" />
        <div className="w-[2px] bg-(--bg-color)" />
      </div>
    </div>
  )
}
