import { NextResponse } from 'next/server'

const getApiUrl = (slug: string, search: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3000'
  if (slug === 'health') return `${baseUrl}/health${search}`
  return `${baseUrl}/api/${slug}${search}`
}

async function handler(request: Request, { params }: { params: { slug?: string[] } }) {
  const slug = params.slug ? params.slug.join('/') : ''
  const { search } = new URL(request.url)
  const apiUrl = getApiUrl(slug, search)

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward Auth Header if present
        ...(request.headers.get('authorization') && { 'Authorization': request.headers.get('authorization')! }),
        // Add API Key if set
        ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
      },
    }

    // Attach body for non-GET/HEAD requests
    if (!['GET', 'HEAD'].includes(request.method)) {
      const text = await request.text()
      if (text) {
        fetchOptions.body = text
      }
    }

    const apiResponse = await fetch(apiUrl, fetchOptions)

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error(`API Error (${apiResponse.status}) from ${apiUrl}: ${errorText}`)
      return new NextResponse(errorText, { status: apiResponse.status, statusText: apiResponse.statusText })
    }

    const data = await apiResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error forwarding request to ${apiUrl}:`, error)
    return new NextResponse('Error forwarding request to backend API.', { status: 502 })
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH }
