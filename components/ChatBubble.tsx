interface ChatBubbleProps {
  role: 'user' | 'assistant';
  message: string;
}

export default function ChatBubble({ role, message }: ChatBubbleProps) {
  return (
    <div className={`flex ${role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className='grow' />
      <div className={`flex flex-col gap-1 ${role === 'user' ? 'items-end' : 'items-start'}`}>
        <div>{role}</div>
        <div className='border rounded-lg p-2'>{message}</div>
      </div>
    </div >
  )
}
