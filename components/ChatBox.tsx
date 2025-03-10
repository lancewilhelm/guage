import ChatBubble from '@/components/ChatBubble'
import { ChatMessage } from '@/components/ChatBubble'

interface ChatBoxProps {
  messages: ChatMessage[]
  isLoading?: boolean
}

export default function ChatBox({ messages, isLoading = false }: ChatBoxProps) {
  return (
    <div className="flex flex-col w-full h-full p-2">
      {
        messages.length === 0 ?
          (
            <div className='flex flex-col grow text-center text-(--sub-color) justify-center'>
              <div className='text-3xl'>No messages</div>
              <div className='italic'>Send your first message in the input box below</div>
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
