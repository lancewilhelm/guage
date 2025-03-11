'use client'
import { useState, useRef, useEffect } from "react"
import AngleRightIcon from '@/components/icons/AngleRight'
import AngleLeftIcon from '@/components/icons/AngleLeft'
import ChatBox from '@/components/ChatBox'
import { ChatMessage } from "@/components/ChatBubble"

export default function Chat() {
  const sidePanelMinWidth = 40
  const [sessionWidth, setSessionWidth] = useState(sidePanelMinWidth); // 0 for mobile, 1 for desktop
  const isResizing = useRef(false);
  const minWidth = 300; // Minimum width for the feedback panel
  const maxWidth = 600; // Maximum width for the feedback panel
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    setSessionWidth(newWidth);
  };

  const togglePanel = () => {
    setSessionWidth(sessionWidth === sidePanelMinWidth ? minWidth : sidePanelMinWidth)
  }

  const scrollToBottom = () => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async () => {
    if (!userInput.trim() || isLoading) return

    // Add the user message to the list 
    const userMessage: ChatMessage = { role: 'user', content: userInput }
    setMessages((prev) => [...prev, userMessage])

    // Set some variables
    setIsLoading(true)
    setUserInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // Add an empty assistant message that will be filled with the streaming response
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      let accumulatedResponse = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedResponse += chunk
        setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: accumulatedResponse }])
      }
    } catch (error) {
      console.error('Error connecting to the chat API:', error)
    } finally {
      setIsLoading(false)
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
                <div className='flex flex-col items-center'>
                  <AngleRightIcon
                    fill="var(--main-color)"
                    className="cursor-pointer"
                    onClick={() => togglePanel()}
                  />
                  <div className='rotate-270 translate-y-full'>Sessions</div>
                </div>
                :
                <div className="flex w-full">
                  <div className='grow text-left'>
                    Sessions
                  </div>
                  <AngleLeftIcon
                    fill="var(--main-color)"
                    className="cursor-pointer"
                    onClick={() => togglePanel()}
                  />
                </div>
            }
          </div>
        </div>
        <div className="w-[1px] bg-(--main-color) relative">
          {/* Resizing handle */}
          <div
            className="flex flex-col gap-1 absolute top-1/2 -translate-y-1/2 -left-1.5 px-1 py-2 bg-(--main-color) rounded cursor-ew-resize items-center justify-center"
            onMouseDown={(e) => {
              e.preventDefault()
              startResizing()
            }}
          >
            <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
            <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
            <div className="w-1 h-1 bg-(--bg-color) rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Center: Chat */}
      <div className="col-start-2 row-start-1 overflow-y-auto chat-container">
        <ChatBox messages={messages} isLoading={isLoading} />
      </div>

      {/* Input & Buttons */}
      <div className="col-start-2 row-start-2 flex gap-2 p-2 border-t border-(--main-color)">
        <textarea
          className="border border-(--main-color) rounded grow p-1"
          placeholder="type a message here..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        ></textarea>
        <div
          className={`border bg-(--text-color) text-(--bg-color) rounded-lg flex items-center p-2  ${(isLoading || !userInput.trim()) ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80 active:opacity-60'}`}
          onClick={() => {
            if (!isLoading || userInput.trim()) {
              handleSubmit()
            }
          }}
        >
          send
        </div>
      </div>
    </div>
  );
}

