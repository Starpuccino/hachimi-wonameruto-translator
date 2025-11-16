import type { ChatTurn } from '../types'

/**
 * 从 localStorage 加载历史记录
 */
export function loadHistory(key: string): ChatTurn[] {
  try {
    const raw = window.localStorage?.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as ChatTurn[]
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to restore history', error)
  }
  return []
}

/**
 * 保存历史记录到 localStorage
 */
export function saveHistory(key: string, history: ChatTurn[]): void {
  try {
    window.localStorage?.setItem(key, JSON.stringify(history))
  } catch (error) {
    console.warn('Unable to persist history', error)
  }
}
