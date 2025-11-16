import type { RoleCopy } from '../types'

export const HISTORY_KEY = 'hachimi-history'
export const HISTORY_LIMIT = 60

export const roleCopy: RoleCopy = {
  human: {
    label: '人类',
    emoji: '😀',
    helper: '输入人类语，哈基米会把它南北绿豆~',
    placeholder: '比如：今晚一起去看极光吗？',
  },
  hachimi: {
    label: '哈基米',
    emoji: '🐱',
    helper: '粘贴哈基米语句，让我南北绿豆成人类语！',
    placeholder: '比如：哈基米~哦南北绿豆♪↗哦耶',
  },
}
