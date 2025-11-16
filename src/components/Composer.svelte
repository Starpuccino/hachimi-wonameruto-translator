<script lang="ts">
  import type { Role } from '../types'
  import { roleCopy } from '../constants'
  import { oppositeRole, translate, type TranslationResult } from '../lib/hachimiTranslator'
  import { copyText, pasteText } from '../utils/clipboard'

  export let role: Role
  export let draft: string
  export let onSend: () => void

  let previewText = ''
  let liveResult: TranslationResult
  let isCopied = false
  let isPasteLoading = false

  $: liveResult = translate(draft, role)
  $: previewText = draft.trim()
    ? liveResult.ok
      ? liveResult.output
      : liveResult.error ?? ''
    : ''

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onSend()
    }
  }

  async function handlePaste() {
    isPasteLoading = true
    try {
      const text = await pasteText()
      if (text) {
        draft = text
      }
    } finally {
      isPasteLoading = false
    }
  }

  function handleClear() {
    draft = ''
  }

  async function handleCopyPreview() {
    await copyText(previewText)
    isCopied = true
    setTimeout(() => {
      isCopied = false
    }, 2000)
  }
</script>

<div class="composer">
  <div class="input-shell" data-role={role}>
    <div class="shell-head">
      <span>{roleCopy[role].emoji} {roleCopy[role].label} · 输入区</span>
      <small>{roleCopy[role].helper}</small>
    </div>
    <div class="shell-body">
      <textarea
        bind:value={draft}
        placeholder={roleCopy[role].placeholder}
        spellcheck="false"
        rows={role === 'human' ? 4 : 3}
        on:keydown={handleKeydown}
      ></textarea>
      <div class="shell-actions">
        <button class="chip" type="button" on:click={handlePaste} disabled={isPasteLoading}>
          {isPasteLoading ? '⏳ 粘贴' : '📋 粘贴'}
        </button>
        <button class="chip" type="button" on:click={handleClear} disabled={!draft.trim()}>
          🐾 清空
        </button>
        <button class="primary send" type="button" data-role={role} on:click={onSend} disabled={!draft.trim()}>
          💌 发送
        </button>
      </div>
    </div>
  </div>
  <div class="input-shell preview" data-role={oppositeRole(role)}>
    <div class="shell-head">
      <span>{roleCopy[oppositeRole(role)].emoji} 用{roleCopy[oppositeRole(role)].label}的话说就是：</span>
      {#if liveResult.stats}
        <small>
          {liveResult.stats.tokenCount} token · 
          {liveResult.stats.inputLength} 字 → {liveResult.stats.outputLength} 字
        </small>
      {:else}
        <small></small>
      {/if}
    </div>
    <div class="shell-body">
      <textarea
        readonly
        bind:value={previewText}
        placeholder="还没有内容，哈基米在等着~"
        class:error={!liveResult.ok && draft.trim()}
      ></textarea>
      <div class="shell-actions">
        <button
          class="primary copy-button"
          type="button"
          data-role={oppositeRole(role)}
          on:click={handleCopyPreview}
          disabled={!previewText.trim()}
        >
          {isCopied ? '✓ 已复制' : '📋 复制'}
        </button>
      </div>
    </div>
  </div>
</div>
