import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function POST(request: Request) {
  return NextResponse.json({ status: 'ok' })
}
