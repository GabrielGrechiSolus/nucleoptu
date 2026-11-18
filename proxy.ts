import { NextResponse, type NextRequest } from 'next/server';
import { ehAgenteBloqueado } from './app/seguranca';

export function proxy(req: NextRequest) {
  if (ehAgenteBloqueado(req.headers.get('user-agent'))) {
    return new NextResponse('Acesso negado.', {
      status: 403,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive, noai, noimageai' },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/client-connections/:path*', '/api/conexoes/:path*'] };
