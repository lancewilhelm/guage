import ChatBubble from '@/components/ChatBubble'

const fakeChatData = [
  { role: 'user', message: 'Hello!' },
  { role: 'assistant', message: 'Hello! How can I help you today?' },
  { role: 'user', message: 'I need help with my account.' },
  { role: 'assistant', message: 'Sure! What seems to be the problem?' },
  { role: 'user', message: 'Hello!' },
  { role: 'assistant', message: 'Hello! How can I help you today?' },
  { role: 'user', message: 'I need help with my account.' },
  { role: 'assistant', message: 'Sure! What seems to be the problem?' },
  { role: 'user', message: 'Hello!' },
  { role: 'assistant', message: 'Hello! How can I help you today?' },
  { role: 'user', message: 'I need help with my account.' },
  { role: 'assistant', message: 'Sure! What seems to be the problem?' },
  { role: 'user', message: 'Hello!' },
  { role: 'assistant', message: 'Hello! How can I help you today?' },
  { role: 'user', message: 'I need help with my account.' },
  { role: 'assistant', message: 'Sure! What seems to be the problem?' },
]

export default function ChatBox() {
  return (
    <div className="flex flex-col w-full p-2">
      {
        fakeChatData.map((chat, index) => (
          <ChatBubble key={index} role={chat.role} message={chat.message} />
        ))
      }
    </div>
  )
}
