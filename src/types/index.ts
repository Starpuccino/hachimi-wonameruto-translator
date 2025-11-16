import type { TranslationStats } from '../lib/hachimiTranslator'

export type Role = 'human' | 'hachimi'

export interface ChatTurn {
  id: string
  role: Role
  original: string
  translated: string
  ok: boolean
  createdAt: number
  stats?: TranslationStats
}

export interface RoleInfo {
  label: string
  emoji: string
  helper: string
  placeholder: string
}

export type RoleCopy = Record<Role, RoleInfo>
