import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { chatSessionsTable } from '@/db/schema'
import { getSession } from '@/utils/auth'
import { eq } from 'drizzle-orm'

// GET handler for fetching all chat sessions for the current user
export async function GET() {
  try {
    // Check for authorized user
    const session = await getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id

    // Fetch chat sessions for the current user, ordered by most recent
    const userChatSessions = await db
      .select({
        id: chatSessionsTable.id,
        title: chatSessionsTable.title,
        createdAt: chatSessionsTable.createdAt,
        updatedAt: chatSessionsTable.updatedAt,
        conversationType: chatSessionsTable.conversationType
      })
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.userId, userId))
      .orderBy(chatSessionsTable.updatedAt)

    return NextResponse.json(userChatSessions)
  } catch (error) {
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    )
  }
}

// POST handler for creating a new chat session
export async function POST(req: NextRequest) {
  try {
    // Check for authorized user
    const session = await getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id
    const { title = 'New Chat', conversationType = 'chat' } = await req.json()

    // Create a new chat session in the database
    const [newSession] = await db
      .insert(chatSessionsTable)
      .values({
        title,
        userId,
        conversationType
      })
      .returning()

    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    console.error('Error creating chat session:', error)
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    )
  }
}
