import { describe, expect, it } from 'vitest'

import { translate } from './hachimiTranslator'

const BASE_CHARS = '哈基米南北绿豆阿西嘎哈亚库曼波哦玛吉利大狗叫没有蛋蛋叮咚鸡叮叮咚咚奶龙哦么吉利哈呀库哦耶内个'
const ASCII_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const SYMBOL_CHARS = " ，。！？;:~*&^%$#@()[]<>{}/\\'\""
const CHAR_POOL = Array.from(BASE_CHARS + ASCII_CHARS + SYMBOL_CHARS + ' ')

const SENTENCE_COUNT = 100

function randomSentence(): string {
  const length = 1 + Math.floor(Math.random() * 120)
  const chars: string[] = []
  for (let i = 0; i < length; i += 1) {
    const pick = Math.floor(Math.random() * CHAR_POOL.length)
    const glyph = CHAR_POOL[pick]
    if (glyph) {
      chars.push(glyph)
    }
  }
  return chars.join('')
}

describe('translate', () => {
  it('round-trips random sentences between human and hachimi', () => {
    for (let i = 0; i < SENTENCE_COUNT; i += 1) {
      const original = randomSentence()
      const encoded = translate(original, 'human')
      expect(encoded.ok).toBe(true)

      const decoded = translate(encoded.output, 'hachimi')
      if (!decoded.ok) {
        throw new Error(
          `Round trip failed for "${original}" -> encoded:${encoded.output} -> ${decoded.error}`
        )
      }
      expect(decoded.output).toBe(original)
    }
  })
})
