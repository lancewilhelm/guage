import ChatBubble from '@/components/ChatBubble'
import { ChatMessage } from '@/components/ChatBubble'

interface ChatBoxProps {
  messages: ChatMessage[]
  isLoading?: boolean
  isSessionLoaded?: boolean
}

export default function ChatBox({ messages, isSessionLoaded = false }: ChatBoxProps) {
  return (
    <div className="flex flex-col w-full h-full p-2">
      {
        messages.length === 0 ?
          (
            <div className='flex flex-col grow text-center text-(--sub-color) justify-center'>
              <div className='text-3xl'>
                {isSessionLoaded ? 'No messages' : 'No session loaded'}
              </div>
              <div className='italic'>
                {
                  isSessionLoaded ?
                    'Send your first message in the input box below' :
                    'Load a session in the panel on the left'
                }
              </div>
            </div>
          ) :
          (
            messages.map((chat, index) => (
              <ChatBubble key={index} role={chat.role} content={chat.content} />
            ))
          )
      }
    </div>
  )
}
