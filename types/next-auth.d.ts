import NextAuth, { DefaultSession } from 'next-auth'
import { JWT as DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
	interface Session {
		user: DefaultSession['user'] & {
			id: string
			role?: 'ADMIN' | 'USER'
		}
	}

	interface User {
		id: string
		email: string
		name?: string | null
		role: 'ADMIN' | 'USER'
	}
}

declare module 'next-auth/jwt' {
	interface JWT extends DefaultJWT {
		userId?: string
		role?: 'ADMIN' | 'USER'
	}
}


