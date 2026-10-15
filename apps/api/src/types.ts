export interface Identity {
  subject: string
  email?: string
  emailVerified: boolean
  displayName?: string
}

export interface User {
  id: string
  preferences: { theme: 'light' | 'dark' | 'system'; locale: string }
  status: 'active' | 'disabled' | 'deletion_pending'
  createdAt: Date
}

export interface UserRepository {
  provision(identity: Identity): Promise<User>
  updatePreferences(userId: string, preferences: User['preferences']): Promise<User>
  requestDeletion(userId: string): Promise<void>
  ping(): Promise<void>
  close(): Promise<void>
}

export type TokenVerifier = (token: string) => Promise<Identity>

declare module 'fastify' {
  interface FastifyRequest { currentUser?: User }
}
