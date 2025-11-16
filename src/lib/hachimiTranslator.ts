import { gunzipSync, gzipSync } from 'fflate'

export type Role = 'human' | 'hachimi'

export interface TranslationStats {
  plainBytes: number
  payloadBytes: number
  tokenCount: number
  inputLength: number
  outputLength: number
}

export type TranslationResult =
  | { ok: true; output: string; stats: TranslationStats }
  | { ok: false; output: ''; error: string; stats?: TranslationStats }

const RADIX = 1024
const HEADER_SCALE = 16
const SALT_RANGE = 64

const VIBES = {
  error: '喵！你在狗叫什么！！！😾😾😾',
}

const BASE_WORDS: string[] = dedupeList(
  [
    '哈基米',
    '南北绿豆',
    '阿西嘎',
    '哈亚库',
    '哈亚库纳咯',
    '曼波',
    '曼波波波',
    '哦玛吉利',
    '大狗叫',
    '没有',
    '蛋蛋',
    '叮咚鸡',
    '叮叮咚咚',
    '奶龙',
    '哦么吉利',
    '哈呀库',
    '哦耶',
    '内个',
  ],
  'BASE_WORDS'
)

const LEAD_BASES = ['哈基米', '南北绿豆', '曼波'] as const
const LEAD_BASE_SET = new Set<string>(LEAD_BASES)

const ONOMATOPOEIA: string[] = dedupeList(
  [
    '啊',
    '哦',
    '呀',
    '呵',
    '耶',
    '喵',
    '诶',
    '叫',
    '噔',
    'duang',
    'leg',
    'mua',
    'miao',
  ],
  'ONOMATOPOEIA'
)

const SYMBOLS: string[] = dedupeList(
  [
    '♪',
    '♫',
    '♬',
    '♩',
    '♭',
    '♮',
    '♯',
    '#',
    '↗',
    '↘',
    '↑',
    '↓',
    '→',
    '~',
    '~~',
    '。',
    ',',
    '!',
    '?',
    '…',
    '·',
    '★',
    '☆',
    '❤',
    '𝄞',
    '𝄢',
    '𝄡',
  ],
  'SYMBOLS'
)

const EMOJIS: string[] = dedupeList(
  ['🐈', '😻', '🐱', '🐈‍⬛', '😺', '😸', '😹', '😼', '😽', '🙀', '😿', '😾'],
  'EMOJIS'
)

const KAOMOJIS: string[] = dedupeList(
  [
    '≧▽≦',
    '＾▽＾',
    '￣▽￣',
    '•‿•',
    '◠‿◠',
    '♥‿♥',
    '¬‿¬',
    'ʘ‿ʘ',
    '•ω•',
    '◕‿◕',
    '≧◡≦',
    '･ω･',
    'ʕ•ᴥ•ʔ',
  ],
  'KAOMOJIS'
)

const BASE_COUNT = BASE_WORDS.length

export interface TranslatorWeights {
  base: number
  onomat: number
  symbol: number
  emoji: number
  kaomoji: number
}

export interface TranslationOptions {
  weights?: Partial<TranslatorWeights>
}

const DEFAULT_WEIGHTS: TranslatorWeights = {
  base: 5,
  onomat: 5,
  symbol: 1,
  emoji: 0.5,
  kaomoji: 0.2,
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const cryptoSource = globalThis.crypto

const maybeProcess = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process
const debugEnabled = !!maybeProcess?.env?.VITEST

function debugLog(message: string, payload?: unknown): void {
  if (debugEnabled) {
    console.debug(`[hachimi] ${message}`, payload)
  }
}

type VariantTemplate = {
  onomatSeed?: number
  symbolSeed?: number
  emojiSeed?: number
  kaomojiSeed?: number
}

type DerivedConfig = {
  weights: TranslatorWeights
  combosPerBase: number
  variantTemplates: VariantTemplate[]
}

const CONFIG_CACHE = new Map<string, DerivedConfig>()

function getConfig(weights?: Partial<TranslatorWeights>): DerivedConfig {
  const resolved = resolveWeights(weights)
  const cacheKey = JSON.stringify([
    resolved.base,
    resolved.onomat,
    resolved.symbol,
    resolved.emoji,
    resolved.kaomoji,
    BASE_WORDS.length,
    ONOMATOPOEIA.length,
    SYMBOLS.length,
    EMOJIS.length,
    KAOMOJIS.length,
  ])

  const cached = CONFIG_CACHE.get(cacheKey)
  if (cached) {
    return cached
  }

  const built = buildConfig(resolved)
  CONFIG_CACHE.set(cacheKey, built)
  return built
}

function resolveWeights(
  weights?: Partial<TranslatorWeights>
): TranslatorWeights {
  const merged = { ...DEFAULT_WEIGHTS, ...weights }
  if (merged.base <= 0) {
    merged.base = DEFAULT_WEIGHTS.base
  }
  return merged
}

function buildConfig(weights: TranslatorWeights): DerivedConfig {
  const combosPerBase = Math.ceil(RADIX / BASE_COUNT)
  const templates: VariantTemplate[] = Array.from(
    { length: combosPerBase },
    () => ({})
  )

  const ratio = (value: number) => {
    if (value <= 0 || weights.base <= 0) {
      return 0
    }
    return Math.min(1, value / weights.base)
  }

  const targetCounts = {
    onomat: Math.min(
      combosPerBase,
      Math.round(combosPerBase * ratio(weights.onomat))
    ),
    symbol: Math.min(
      combosPerBase,
      Math.round(combosPerBase * ratio(weights.symbol))
    ),
    emoji: Math.min(
      combosPerBase,
      Math.round(combosPerBase * ratio(weights.emoji))
    ),
    kaomoji: Math.min(
      combosPerBase,
      Math.round(combosPerBase * ratio(weights.kaomoji))
    ),
  }

  distributeCategory(
    'onomatSeed',
    targetCounts.onomat,
    ONOMATOPOEIA.length,
    templates
  )
  distributeCategory(
    'symbolSeed',
    targetCounts.symbol,
    SYMBOLS.length,
    templates
  )
  distributeCategory('emojiSeed', targetCounts.emoji, EMOJIS.length, templates)
  distributeCategory(
    'kaomojiSeed',
    targetCounts.kaomoji,
    KAOMOJIS.length,
    templates
  )

  ensureUniqueTemplates(templates)

  return { weights, combosPerBase, variantTemplates: templates }
}

function templateSignature(template: VariantTemplate): string {
  return [
    template.onomatSeed ?? 'x',
    template.symbolSeed ?? 'x',
    template.emojiSeed ?? 'x',
    template.kaomojiSeed ?? 'x',
  ].join('|')
}

function ensureUniqueTemplates(templates: VariantTemplate[]): void {
  const used = new Set<string>()
  templates.forEach((template, index) => {
    let signature = templateSignature(template)
    if (used.has(signature)) {
      signature = forceUniqueTemplate(template, index, used)
    }
    used.add(signature)
  })
}

function forceUniqueTemplate(
  template: VariantTemplate,
  variantIndex: number,
  used: Set<string>
): string {
  const baseCandidates = [
    { key: 'emojiSeed' as const, pool: EMOJIS.length },
    { key: 'symbolSeed' as const, pool: SYMBOLS.length },
    { key: 'kaomojiSeed' as const, pool: KAOMOJIS.length },
    { key: 'onomatSeed' as const, pool: ONOMATOPOEIA.length },
  ]
  const candidates = baseCandidates.filter((entry) => entry.pool > 0)

  if (candidates.length === 0) {
    throw new Error('no-category-to-break-collision')
  }

  const prioritized = [
    ...candidates.filter((entry) => template[entry.key] === undefined),
    ...candidates.filter((entry) => template[entry.key] !== undefined),
  ]

  for (const candidate of prioritized) {
    const original = template[candidate.key]
    const baseSeed = (original ?? variantIndex) % candidate.pool
    for (let step = 0; step < candidate.pool; step += 1) {
      const updated = (baseSeed + step) % candidate.pool
      template[candidate.key] =
        updated as VariantTemplate[keyof VariantTemplate]
      const signature = templateSignature(template)
      if (!used.has(signature)) {
        return signature
      }
    }
    if (original === undefined) {
      template[candidate.key] = undefined
    } else {
      template[candidate.key] = original
    }
  }

  throw new Error('unable-to-deduplicate-variants')
}

function distributeCategory(
  key: keyof VariantTemplate,
  count: number,
  poolLength: number,
  templates: VariantTemplate[]
): void {
  if (count <= 0 || poolLength === 0) {
    return
  }

  const step = templates.length / count
  let cursor = 0
  for (let assigned = 0; assigned < count; assigned += 1) {
    const preferred = Math.min(templates.length - 1, Math.floor(cursor))
    const slot = findAvailableTemplate(templates, preferred, key)
    templates[slot][key] = assigned % poolLength
    cursor += step
  }
}

function findAvailableTemplate(
  templates: VariantTemplate[],
  start: number,
  key: keyof VariantTemplate
): number {
  const length = templates.length
  for (let offset = 0; offset < length; offset += 1) {
    const index = (start + offset) % length
    if (templates[index][key] === undefined) {
      return index
    }
  }
  return start % length
}

function randomIndex(limit: number): number {
  if (limit <= 1) return 0
  if (cryptoSource?.getRandomValues) {
    const bucket = new Uint32Array(1)
    cryptoSource.getRandomValues(bucket)
    return bucket[0] % limit
  }
  return Math.floor(Math.random() * limit)
}

type TokenParts = {
  onomatIdx?: number
  symbolIdx?: number
  emojiIdx?: number
  kaomojiIdx?: number
}

const BASE_MATCHER = buildMatcher(BASE_WORDS)
const ONO_MATCHER = buildMatcher(ONOMATOPOEIA)
const SYMBOL_MATCHER = buildMatcher(SYMBOLS)
const EMOJI_MATCHER = buildMatcher(EMOJIS)
const KAO_MATCHER = buildMatcher(KAOMOJIS)

function encodeHuman(text: string, config: DerivedConfig): TranslationResult {
  const inputLength = text.length
  if (!text.trim()) {
    return {
      ok: true,
      output: '',
      stats: {
        plainBytes: 0,
        payloadBytes: 0,
        tokenCount: 0,
        inputLength,
        outputLength: 0,
      },
    }
  }

  try {
    const payload = packPayload(text)
    const compressed = gzipSync(payload, { mtime: 0, level: 9 })
    const { chunks, tailBits } = chunkify(compressed)

    const salt = randomIndex(SALT_RANGE)
    const headerValue = tailBits + HEADER_SCALE * salt
    const encodedTokens: string[] = []
    encodedTokens.push(valueToToken(headerValue, config))
    chunks.forEach((chunk) => {
      const shifted = (chunk + salt) % RADIX
      encodedTokens.push(valueToToken(shifted, config))
    })

    const leadToken = LEAD_BASES[randomIndex(LEAD_BASES.length)]
    const output = leadToken + encodedTokens.join('')

    return {
      ok: true,
      output,
      stats: {
        plainBytes: payload.length - 4,
        payloadBytes: compressed.length,
        tokenCount: chunks.length,
        inputLength,
        outputLength: output.length,
      },
    }
  } catch (error) {
    console.error('Hachimi encode failed', error)
    return { ok: false, output: '', error: VIBES.error }
  }
}

function decodeHachimi(text: string, config: DerivedConfig): TranslationResult {
  const compact = text.replace(/\s+/g, '')
  const inputLength = text.length
  if (!compact) {
    return {
      ok: true,
      output: '',
      stats: {
        plainBytes: 0,
        payloadBytes: 0,
        tokenCount: 0,
        inputLength,
        outputLength: 0,
      },
    }
  }

  try {
    const parsedTokens = parseTokens(compact)
    if (!parsedTokens || parsedTokens.length < 2) {
      debugLog('decode-parse-failed', {
        compact,
        parsed: parsedTokens?.length ?? 0,
      })
      return { ok: false, output: '', error: VIBES.error }
    }

    const [leadToken, ...payloadTokens] = parsedTokens
    const leadWord = BASE_WORDS[leadToken.baseIndex]
    if (!LEAD_BASE_SET.has(leadWord)) {
      return { ok: false, output: '', error: VIBES.error }
    }

    const headerValue = tokenPartsToValue(payloadTokens[0], config)
    if (headerValue === null) {
      debugLog('decode-header-token-mismatch', { token: payloadTokens[0] })
      return { ok: false, output: '', error: VIBES.error }
    }

    const salt = Math.floor(headerValue / HEADER_SCALE)
    const tailBits = headerValue % HEADER_SCALE
    if (salt >= SALT_RANGE || tailBits >= 10) {
      debugLog('decode-header-out-of-range', { salt, tailBits })
      return { ok: false, output: '', error: VIBES.error }
    }

    const chunkValues: number[] = []
    payloadTokens.slice(1).forEach((token, index) => {
      const effectiveValue = tokenPartsToValue(token, config)
      if (effectiveValue === null) {
        debugLog('decode-payload-token-mismatch', { token, index })
        throw new Error('invalid-token')
      }
      const original = (effectiveValue - salt + RADIX) % RADIX
      chunkValues.push(original)
    })

    if (chunkValues.length === 0) {
      debugLog('decode-empty-chunks')
      return { ok: false, output: '', error: VIBES.error }
    }

    const compressed = unchunkify(chunkValues, tailBits)
    let restoredPayload: Uint8Array
    try {
      restoredPayload = gunzipSync(compressed)
    } catch (gunzipError) {
      debugLog('decode-gzip-failed', { chunkValues, tailBits, headerValue })
      throw gunzipError
    }
    const restored = unpackPayload(restoredPayload)

    if (!selfCheck(restored, chunkValues, tailBits)) {
      debugLog('decode-self-check-failed', {
        restored,
        chunkValues,
        tailBits,
        reencoded: chunkify(
          gzipSync(packPayload(restored), { mtime: 0, level: 9 })
        ).chunks,
      })
      return { ok: false, output: '', error: VIBES.error }
    }

    return {
      ok: true,
      output: restored,
      stats: {
        plainBytes: textEncoder.encode(restored).length,
        payloadBytes: compressed.length,
        tokenCount: chunkValues.length,
        inputLength,
        outputLength: restored.length,
      },
    }
  } catch (error) {
    debugLog('decode-exception', error)
    return { ok: false, output: '', error: VIBES.error }
  }
}

export function translate(
  text: string,
  role: Role,
  options?: TranslationOptions
): TranslationResult {
  const config = getConfig(options?.weights)
  return role === 'human'
    ? encodeHuman(text, config)
    : decodeHachimi(text, config)
}

export function oppositeRole(role: Role): Role {
  return role === 'human' ? 'hachimi' : 'human'
}

function selfCheck(
  message: string,
  observedChunks: number[],
  observedTail: number
): boolean {
  try {
    const payload = packPayload(message)
    const compressed = gzipSync(payload, { mtime: 0, level: 9 })
    const next = chunkify(compressed)
    if (next.tailBits !== observedTail) {
      return false
    }
    if (next.chunks.length !== observedChunks.length) {
      return false
    }
    for (let i = 0; i < next.chunks.length; i += 1) {
      if (next.chunks[i] !== observedChunks[i]) {
        return false
      }
    }
    return true
  } catch (error) {
    console.error('Hachimi self-check failed', error)
    return false
  }
}

function chunkify(bytes: Uint8Array): { chunks: number[]; tailBits: number } {
  let buffer = 0
  let bitCount = 0
  const chunks: number[] = []

  bytes.forEach((byte) => {
    buffer = (buffer << 8) | byte
    bitCount += 8
    while (bitCount >= 10) {
      bitCount -= 10
      const chunk = (buffer >> bitCount) & 0x3ff
      chunks.push(chunk)
      buffer &= (1 << bitCount) - 1
    }
  })

  const tailBits = bitCount
  if (bitCount > 0) {
    const chunk = (buffer << (10 - bitCount)) & 0x3ff
    chunks.push(chunk)
  }

  return { chunks, tailBits }
}

function unchunkify(chunks: number[], tailBits: number): Uint8Array {
  if (chunks.length === 0) {
    return new Uint8Array()
  }

  const bytes: number[] = []
  let buffer = 0
  let bitCount = 0

  chunks.forEach((chunk, index) => {
    let value = chunk
    let bits = 10
    if (index === chunks.length - 1 && tailBits > 0 && tailBits < 10) {
      value >>= 10 - tailBits
      bits = tailBits
    }
    buffer = (buffer << bits) | value
    bitCount += bits
    while (bitCount >= 8) {
      bitCount -= 8
      const byte = (buffer >> bitCount) & 0xff
      bytes.push(byte)
      buffer &= (1 << bitCount) - 1
    }
  })

  if (bitCount !== 0) {
    throw new Error('dangling-bits')
  }

  return new Uint8Array(bytes)
}

type Matcher = Array<{ token: string; index: number }>

function buildMatcher(pool: string[]): Matcher {
  return pool
    .map((token, index) => ({ token, index }))
    .sort((a, b) => b.token.length - a.token.length)
}

type ParsedToken = {
  baseIndex: number
  parts: TokenParts
  end: number
}

const CATEGORY_SEQUENCE: Array<{
  matcher: Matcher
  assign: keyof TokenParts
}> = [
  { matcher: ONO_MATCHER, assign: 'onomatIdx' },
  { matcher: EMOJI_MATCHER, assign: 'emojiIdx' },
  { matcher: SYMBOL_MATCHER, assign: 'symbolIdx' },
  { matcher: KAO_MATCHER, assign: 'kaomojiIdx' },
]

function parseTokens(text: string): ParsedToken[] | null {
  const memo = new Map<number, ParsedToken[] | null>()

  function dfs(index: number): ParsedToken[] | null {
    if (index === text.length) {
      return []
    }
    if (memo.has(index)) {
      return memo.get(index) ?? null
    }

    const options = collectTokenOptions(text, index)
    for (const option of options) {
      const continuation = dfs(option.end)
      if (continuation) {
        const result = [option, ...continuation]
        memo.set(index, result)
        return result
      }
    }

    memo.set(index, null)
    return null
  }

  return dfs(0)
}

function collectTokenOptions(text: string, start: number): ParsedToken[] {
  const baseMatch = matchAt(BASE_MATCHER, text, start)
  if (!baseMatch) {
    debugLog('parse-base-miss', { start, peek: text.slice(start, start + 12) })
    return []
  }
  const resolvedBaseMatch = baseMatch

  const results: ParsedToken[] = []

  function walk(
    categoryIndex: number,
    cursor: number,
    parts: TokenParts
  ): void {
    if (categoryIndex === CATEGORY_SEQUENCE.length) {
      results.push({
        baseIndex: resolvedBaseMatch.index,
        parts: { ...parts },
        end: cursor,
      })
      return
    }

    const descriptor = CATEGORY_SEQUENCE[categoryIndex]
    const match = matchAt(descriptor.matcher, text, cursor)

    if (match) {
      const nextParts: TokenParts = {
        ...parts,
        [descriptor.assign]: match.index,
      }
      walk(categoryIndex + 1, cursor + match.token.length, nextParts)
    }

    // Option 2: skip this category only if needed
    walk(categoryIndex + 1, cursor, parts)
  }

  walk(0, start + resolvedBaseMatch.token.length, {})
  return results
}

function matchAt(matcher: Matcher, text: string, start: number) {
  for (const entry of matcher) {
    if (text.startsWith(entry.token, start)) {
      return entry
    }
  }
  return null
}

function tokenPartsToValue(
  token: ParsedToken,
  config: DerivedConfig
): number | null {
  const variantIndex = locateVariantIndex(token.baseIndex, token.parts, config)
  if (variantIndex < 0) {
    return null
  }
  const value = variantIndex * BASE_COUNT + token.baseIndex
  if (value >= RADIX) {
    return null
  }
  return value
}

function valueToToken(value: number, config: DerivedConfig): string {
  if (value < 0 || value >= RADIX) {
    throw new Error('value-out-of-range')
  }
  const variantIndex = Math.floor(value / BASE_COUNT)
  const baseIndex = value % BASE_COUNT
  if (variantIndex >= config.variantTemplates.length) {
    throw new Error('variant-overflow')
  }
  const parts = materializeParts(
    config.variantTemplates[variantIndex],
    baseIndex
  )
  return composeToken(baseIndex, parts)
}

function composeToken(baseIndex: number, parts: TokenParts): string {
  let token = BASE_WORDS[baseIndex]
  if (parts.onomatIdx !== undefined) {
    token += ONOMATOPOEIA[parts.onomatIdx]
  }
  if (parts.emojiIdx !== undefined) {
    token += EMOJIS[parts.emojiIdx]
  }
  if (parts.symbolIdx !== undefined) {
    token += SYMBOLS[parts.symbolIdx]
  }
  if (parts.kaomojiIdx !== undefined) {
    token += KAOMOJIS[parts.kaomojiIdx]
  }
  return token
}

function materializeParts(
  template: VariantTemplate,
  baseIndex: number
): TokenParts {
  const parts: TokenParts = {}
  if (template.onomatSeed !== undefined && ONOMATOPOEIA.length > 0) {
    parts.onomatIdx = (template.onomatSeed + baseIndex) % ONOMATOPOEIA.length
  }
  if (template.symbolSeed !== undefined && SYMBOLS.length > 0) {
    parts.symbolIdx = (template.symbolSeed + baseIndex) % SYMBOLS.length
  }
  if (template.emojiSeed !== undefined && EMOJIS.length > 0) {
    parts.emojiIdx = (template.emojiSeed + baseIndex) % EMOJIS.length
  }
  if (template.kaomojiSeed !== undefined && KAOMOJIS.length > 0) {
    parts.kaomojiIdx = (template.kaomojiSeed + baseIndex) % KAOMOJIS.length
  }
  return parts
}

function locateVariantIndex(
  baseIndex: number,
  parts: TokenParts,
  config: DerivedConfig
): number {
  for (let i = 0; i < config.variantTemplates.length; i += 1) {
    if (matchesTemplate(config.variantTemplates[i], baseIndex, parts)) {
      return i
    }
  }
  return -1
}

function matchesTemplate(
  template: VariantTemplate,
  baseIndex: number,
  parts: TokenParts
): boolean {
  if (
    !matchCategory(
      template.onomatSeed,
      ONOMATOPOEIA.length,
      baseIndex,
      parts.onomatIdx
    )
  ) {
    return false
  }
  if (
    !matchCategory(
      template.symbolSeed,
      SYMBOLS.length,
      baseIndex,
      parts.symbolIdx
    )
  ) {
    return false
  }
  if (
    !matchCategory(template.emojiSeed, EMOJIS.length, baseIndex, parts.emojiIdx)
  ) {
    return false
  }
  if (
    !matchCategory(
      template.kaomojiSeed,
      KAOMOJIS.length,
      baseIndex,
      parts.kaomojiIdx
    )
  ) {
    return false
  }
  return true
}

function matchCategory(
  seed: number | undefined,
  poolLength: number,
  baseIndex: number,
  observed?: number
): boolean {
  if (seed === undefined || poolLength === 0) {
    return observed === undefined
  }
  if (observed === undefined) {
    return false
  }
  const expected = (seed + baseIndex) % poolLength
  return expected === observed
}

function dedupeList(values: string[], label: string): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  values.forEach((value) => {
    if (!seen.has(value)) {
      seen.add(value)
      unique.push(value)
    } else {
      console.warn(`[hachimi] removed duplicate entry "${value}" from ${label}`)
    }
  })
  return unique
}

function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function numberToBytes(value: number): Uint8Array {
  const buffer = new ArrayBuffer(4)
  new DataView(buffer).setUint32(0, value, false)
  return new Uint8Array(buffer)
}

function bytesToNumber(bytes: Uint8Array): number {
  if (bytes.length !== 4) return 0
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  ).getUint32(0, false)
}

function packPayload(text: string): Uint8Array {
  const body = textEncoder.encode(text)
  const checksum = numberToBytes(fnv1a(body))
  const payload = new Uint8Array(body.length + checksum.length)
  payload.set(body, 0)
  payload.set(checksum, body.length)
  return payload
}

function unpackPayload(payload: Uint8Array): string {
  if (payload.length < 4) {
    throw new Error('payload-too-short')
  }
  const body = payload.subarray(0, payload.length - 4)
  const storedChecksum = payload.subarray(payload.length - 4)
  const computed = fnv1a(body)
  if (computed !== bytesToNumber(storedChecksum)) {
    throw new Error('checksum-mismatch')
  }
  return textDecoder.decode(body)
}
