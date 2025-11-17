<script lang="ts">
  import type { ChatTurn } from '../types'
  import { roleCopy } from '../constants'
  import { oppositeRole } from '../lib/hachimiTranslator'
  import { copyText } from '../utils/clipboard'
  import { formatTimestamp } from '../utils/format'
  import hachimiBikeGif from '../assets/hachimi-bike.gif'

  export let history: ChatTurn[]
  export let onClear: () => void

  let copiedId: string | null = null

  async function handleCopyOriginal(content: string, id: string) {
    await copyText(content)
    copiedId = `original-${id}`
    setTimeout(() => {
      copiedId = null
    }, 2000)
  }

  async function handleCopyTranslation(content: string, id: string) {
    await copyText(content)
    copiedId = `translation-${id}`
    setTimeout(() => {
      copiedId = null
    }, 2000)
  }
</script>

<section class="history">
  <div class="history-head">
    <div>
      <h2>对话记录</h2>
      <span>{history.length} 条交互</span>
    </div>
    <button class="ghost" type="button" on:click={onClear}>
      🐾 清空对话
    </button>
  </div>
  {#if history.length === 0}
    <p class="empty">还没有过南北绿豆捏~
      <img src={hachimiBikeGif} alt="" class="hachimi-bike-gif" />
    </p>
  {:else}
    <ul>
      {#each history as turn (turn.id)}
        <li class="turn">
          <article class={`bubble ${turn.role}`}>
            <header>
              <span>
                {roleCopy[turn.role].emoji}
                {turn.role === 'human' ? ' 人类' : ' 哈基米'} · 原文
              </span>
              <time>{formatTimestamp(turn.createdAt)}</time>
            </header>
            <div class="bubble-body">
              <p>{turn.original}</p>
              <div class="bubble-body-actions">
                <button
                  class="chip copy-floating"
                  type="button"
                  on:click={() => handleCopyOriginal(turn.original, turn.id)}
                  disabled={!turn.original?.trim()}
                >
                  {copiedId === `original-${turn.id}` ? '✓ 已复制' : '📋 复制'}
                </button>
              </div>
            </div>
          </article>
          <article class={`bubble ${oppositeRole(turn.role)} reply ${turn.ok ? '' : 'error'}`}>
            <header>
              <span>
                {turn.ok ? roleCopy[oppositeRole(turn.role)].emoji : '😡'}
                {turn.role === 'human' ? ' 哈基米' : ' 人类'} · {turn.ok ? '译文' : '抱歉'}
              </span>
              <div class="header-tools">
                {#if turn.stats}
                  <small>{turn.stats.tokenCount} token</small>
                {/if}
              </div>
            </header>
            <div class="bubble-body">
              <p>{turn.translated}</p>
              <div class="bubble-body-actions">
                <button
                  class="chip copy-floating"
                  type="button"
                  on:click={() => handleCopyTranslation(turn.translated, turn.id)}
                  disabled={!turn.translated?.trim()}
                >
                  {copiedId === `translation-${turn.id}` ? '✓ 已复制' : '📋 复制'}
                </button>
              </div>
            </div>
          </article>
        </li>
      {/each}
    </ul>
  {/if}
</section>
