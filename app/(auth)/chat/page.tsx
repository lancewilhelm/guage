'use client'
import { useState, useEffect } from "react"
import ChatBox from '@/components/ChatBox'
import InputRow from '@/components/InputRow'
import SidePanel from '@/components/SidePanel'
import { ChatMessage } from "@/components/ChatBubble"
import Header from '@/components/Header'
import PlusIcon from '@/components/icons/Plus'
import { selectChatSession } from '@/db/schema'

export default function Chat() {
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

  // Scroll the chatbax to the bottom as messages are added
  const scrollToBottom = () => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // Call the scroll to the bottom function as messages are added
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * Handle the submission of new messages to the backend
   */
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
    <div className="grid h-full grid-rows-[40px_1fr_min-content] grid-cols-[auto_1fr]">
      <div className='col-start-2'>
        <Header />
      </div>

      {/* Session Panel (Collapsible) */}
      <div className='col-start-1 row-start-1 row-span-3'>
        <SidePanel >
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
        </SidePanel>
      </div>

      {/* Center: Chat */}
      <div className="col-start-2 row-start-2 overflow-y-auto chat-container">
        <ChatBox messages={messages} isLoading={isLoading} isSessionLoaded={!!currentChatSessionId} />
      </div>

      <InputRow
        submitHandler={handleSubmit}
        inputValue={userInput}
        setInputValue={setUserInput}
        isLoading={isLoading}
        buttonLabel="send"
        disabled={!currentChatSessionId}
      />
    </div >
  );
}

