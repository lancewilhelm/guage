import { OpenAI } from 'openai'
import { getSession } from '@/utils/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  // Check for authorized user
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Parse the request body
  const { messages } = await req.json()
  console.log('Messages:', messages)
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response('Invalid request: messages are required', { status: 400 })
  }

  try {
    // Start the OpenAI completion
    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      model: 'gpt-4o-mini',
      stream: true
    }
    const completion = await openai.chat.completions.create(params)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content || ''
            controller.enqueue(encoder.encode(text))
          }
        } catch (error) {
          controller.enqueue(encoder.encode('Error: Failed to stream response.'))
          console.error('Error streaming response:', error)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      }
    })
  } catch (error) {
    console.log('Error in the chat API:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
