import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(req: NextRequest) {
	const url = new URL(req.url)
	const { pathname } = url

	// Allowlist
	const allowedPrefixes = [
		'/login',
		'/register',
		'/_next',
		'/favicon.ico',
		'/public',
		'/api/auth',
		'/api/health',
	]
	if (allowedPrefixes.some((p) => pathname.startsWith(p))) {
		return NextResponse.next()
	}

	// Protected app routes
	const protectedPrefixes = ['/chat', '/admin', '/profile']
	const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))
	if (!isProtected) return NextResponse.next()

	// Detect auth via next-auth cookie (dev + prod names) or e2e test cookie
	const hasSession = Boolean(
		req.cookies.get('next-auth.session-token')?.value ||
		req.cookies.get('__Secure-next-auth.session-token')?.value ||
		req.cookies.get('e2e_role')?.value
	)

	// E2E bypass via env
	const bypass = process.env.E2E_BYPASS_AUTH === '1' || process.env.NODE_ENV !== 'production'
	if (hasSession || bypass) return NextResponse.next()

	// Redirect to login with next param
	const loginUrl = new URL('/login', req.url)
	loginUrl.searchParams.set('next', pathname)
	return NextResponse.redirect(loginUrl)
}
