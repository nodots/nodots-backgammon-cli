import { ApiService } from '../services/api'
import { AuthService, UserProfile } from '../services/auth'

export interface ShellContext {
  api: ApiService
  auth: AuthService
  user: UserProfile
  currentGameId: string | null
}

export function createShellContext(
  api: ApiService,
  auth: AuthService,
  user: UserProfile
): ShellContext {
  return {
    api,
    auth,
    user,
    currentGameId: null,
  }
}
