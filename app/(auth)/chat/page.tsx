'use client'
import { useState, useRef } from "react"
import AngleRightIcon from '@/components/icons/AngleRight'
import AngleLeftIcon from '@/components/icons/AngleLeft'
import ChatBox from '@/components/ChatBox'

export default function RolePlay() {
  const sidePanelMinWidth = 40
  const [sessionWidth, setSessionWidth] = useState(sidePanelMinWidth); // 0 for mobile, 1 for desktop
  const isResizing = useRef('');
  const minWidth = 300; // Minimum width for the feedback panel
  const maxWidth = 600; // Maximum width for the feedback panel

  const startResizing = (e: React.MouseEvent<HTMLDivElement>, panel: string) => {
    isResizing.current = panel;

    const handleMouseMove = (e: MouseEvent) => {
      resize(e);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      isResizing.current = '';
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  const resize = (event: MouseEvent) => {
    if (!isResizing.current) return;

    const panel = isResizing.current;
    let width = 0;

    if (panel === 'session') {
      width = event.clientX;
    } else if (panel === 'feedback') {
      width = window.innerWidth - event.clientX;
    }

    let newWidth = width;
    if (width < (minWidth / 2)) {
      newWidth = sidePanelMinWidth;
    } else {
      newWidth = Math.max(minWidth, Math.min(width, maxWidth));
    }

    if (panel === 'feedback') {
      setFeedbackWidth(newWidth);
    } else if (panel === 'session') {
      setSessionWidth(newWidth);
    }
  };

  const togglePanel = (panel: 'session' | 'feedback') => {
    if (panel === 'session') {
      setSessionWidth(sessionWidth === sidePanelMinWidth ? minWidth : sidePanelMinWidth)
    } else if (panel === 'feedback') {
      return
    }
  }

  return (
    <div className="grid h-full grid-rows-[1fr_min-content] grid-cols-[auto_1fr]">
      {/* Session Panel (Collapsible) */}
      <div className="flex col-start-1 row-span-2">
        <div
          className="flex justify-center p-2 overflow-hidden"
          style={{ width: sessionWidth }}
        >
          <div className='flex w-full justify-center'>
            {
              sessionWidth < minWidth ?
                <AngleRightIcon
                  fill="var(--main-color)"
                  className="cursor-pointer"
                  onClick={() => togglePanel('session')}
                /> :
                <div className="flex w-full">
                  <div className='grow text-left'>
                    Sessions
                  </div>
                  <AngleLeftIcon
                    fill="var(--main-color)"
                    className="cursor-pointer"
                    onClick={() => togglePanel('session')}
                  />
                </div>
            }
          </div>
        </div>
        <div className="w-[1px] bg-(--main-color) relative">
          {/* Resizing handle */}
          <div
            className="flex flex-col gap-1 absolute top-1/2 -translate-y-1/2 -left-1.5 px-1 py-2 bg-(--main-color) rounded cursor-ew-resize items-center justify-center"
            onMouseDown={(e) => startResizing(e, 'session')}
          >
            <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
            <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
            <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Center: Chat */}
      <div className="col-start-2 row-start-1 overflow-y-auto">
        <ChatBox />
      </div>

      {/* Feedback Panel (Collapsible) */}
      <div className="flex col-start-3 row-span-3">
        <div className="flex col-start-3 row-span-3">
          <div className="w-[1px] bg-(--main-color) relative">
            {/* Resizing handle */}
            <div
              className="flex flex-col gap-1 absolute top-1/2 -translate-y-1/2 -left-1.5 px-1 py-2 bg-(--main-color) rounded cursor-ew-resize items-center justify-center"
              onMouseDown={(e) => startResizing(e, 'feedback')}
            >
              <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
              <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
              <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
            </div>
          </div>

        </div>
      </div>

      {/* Input & Buttons */}
      <div className="col-start-2 row-start-2 flex gap-2 p-2 border-t border-(--main-color)">
        <textarea className="border border-(--main-color) rounded grow p-1" placeholder="type a message here..."></textarea>
        <div className="border bg-(--text-color) text-(--bg-color) rounded-lg flex items-center p-2 hover:opacity-80 active:opacity-60 cursor-pointer">
          send
        </div>
      </div>
    </div>
  );
}

