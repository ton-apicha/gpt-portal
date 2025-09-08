import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function applySecurityHeaders(req: NextRequest, res: NextResponse): NextResponse {
	try {
		const isProd = process.env.NODE_ENV === 'production'
		const proto = req.headers.get('x-forwarded-proto') || 'http'
		const cspPartsProd = [
			"default-src 'self'",
			"base-uri 'self'",
			"img-src 'self' data: blob:",
			"font-src 'self' data:",
			"style-src 'self' 'unsafe-inline'",
			"script-src 'self'",
			"connect-src 'self'",
			"frame-ancestors 'none'",
			"form-action 'self'",
			"object-src 'none'",
		]
		const cspPartsDev = [
			"default-src 'self'",
			"img-src 'self' data: blob:",
			"style-src 'self' 'unsafe-inline'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
			"connect-src 'self'",
			"frame-ancestors 'none'",
		]
		const csp = (isProd ? cspPartsProd : cspPartsDev).join('; ')
		res.headers.set('Content-Security-Policy', csp)
		res.headers.set('Referrer-Policy', 'no-referrer')
		res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
		res.headers.set('X-Frame-Options', 'DENY')
		res.headers.set('X-Content-Type-Options', 'nosniff')
		res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
		res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
		if (isProd && proto === 'https') {
			res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
		}
	} catch {}
	return res
}

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
		return applySecurityHeaders(req, NextResponse.next())
	}

	// Protected app routes
	const protectedPrefixes = ['/chat', '/admin', '/profile']
	const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))
	if (!isProtected) return applySecurityHeaders(req, NextResponse.next())

	// Detect auth via next-auth cookie (dev + prod names) or e2e test cookie
	const hasSession = Boolean(
		req.cookies.get('next-auth.session-token')?.value ||
		req.cookies.get('__Secure-next-auth.session-token')?.value ||
		req.cookies.get('e2e_role')?.value
	)

	// E2E bypass via env
	const bypass = process.env.E2E_BYPASS_AUTH === '1' || process.env.NODE_ENV !== 'production'
	if (hasSession || bypass) return applySecurityHeaders(req, NextResponse.next())

	// Redirect to login with next param
	const loginUrl = new URL('/login', req.url)
	loginUrl.searchParams.set('next', pathname)
	return applySecurityHeaders(req, NextResponse.redirect(loginUrl))
}
