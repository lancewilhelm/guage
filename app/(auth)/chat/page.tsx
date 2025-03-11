'use client'
import { useState, useRef, useEffect } from "react"
import AngleRightIcon from '@/components/icons/AngleRight'
import AngleLeftIcon from '@/components/icons/AngleLeft'
import PlusIcon from '@/components/icons/Plus'
import ChatBox from '@/components/ChatBox'
import { ChatMessage } from "@/components/ChatBubble"
import { selectChatSession } from '@/db/schema'

export default function Chat() {
  const sidePanelMinWidth = 40
  const [sessionWidth, setSessionWidth] = useState(sidePanelMinWidth) // 0 for mobile, 1 for desktop
  const isResizing = useRef(false)
  const minWidth = 300
  const maxWidth = 600
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatSessions, setChatSessions] = useState<selectChatSession[]>([])
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string | undefined>(undefined)
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchChatSessions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/chat/sessions')
      if (!response.ok) throw new Error('Failed to fetch chat sessions')
      const data = await response.json()
      setChatSessions(data)
    } catch (error) {
      console.error('Error fetching chat sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadChatSession = async (sessionId: string) => {
    setCurrentChatSessionId(sessionId)
    try {
      setIsLoading(true)
      const response = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`)
      if (!response.ok) throw new Error('Failed to fetch chat messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching chat messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch chat sessions when the compnent mounts
  useEffect(() => {
    fetchChatSessions()
  }, [currentChatSessionId])

  // Function to create new chat session
  const createChatSession = async () => {
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat Session', conversationType: 'chat' })
      })

      if (!response.ok) throw new Error('Failed to create chat session')

      const newChatSession = await response.json()
      setChatSessions([newChatSession, ...chatSessions])
      setCurrentChatSessionId(newChatSession.id)
    } catch (error) {
      console.error('Error creating chat session:', error)
    }
  }

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
    if (!userInput.trim() || isLoading || currentChatSessionId === undefined) return

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
        body: JSON.stringify({ messages: [...messages, userMessage], sessionId: currentChatSessionId })
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
          {
            sessionWidth < minWidth ?
              <div className='flex flex-col w-full items-center'>
                <div
                  className='flex flex-col items-center mb-15 cursor-pointer'
                  onClick={() => togglePanel()}
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
                    onClick={() => togglePanel()}
                  />
                </div>
                <PlusIcon
                  fill="var(--main-color)"
                  className="cursor-pointer"
                  onClick={createChatSession}
                />
                <div className='flex flex-col w-full gap-2'>
                  {
                    chatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => loadChatSession(session.id)}
                        className='cursor-pointer hover:opacity-80'
                      >
                        {session.title}
                      </div>
                    ))
                  }
                </div>
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

      {/* Center: Chat */}
      <div className="col-start-2 row-start-1 overflow-y-auto chat-container">
        <ChatBox messages={messages} isLoading={isLoading} isSessionLoaded={!!currentChatSessionId} />
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
          className={`border bg - (--text - color) text - (--bg - color) rounded - lg flex items - center p - 2  ${(isLoading || !userInput.trim()) ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80 active:opacity-60'}`}
          onClick={() => {
            if (!isLoading || userInput.trim()) {
              handleSubmit()
            }
          }}
        >
          send
        </div>
      </div>
    </div >
  );
}

