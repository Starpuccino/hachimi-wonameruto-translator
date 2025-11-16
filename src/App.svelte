<script lang="ts">
  import { onMount } from 'svelte'
  import { translate } from './lib/hachimiTranslator'
  import type { ChatTurn, Role } from './types'
  import { HISTORY_KEY, HISTORY_LIMIT } from './constants'
  import { loadHistory, saveHistory } from './utils/storage'
  import Hero from './components/Hero.svelte'
  import RoleSwitch from './components/RoleSwitch.svelte'
  import Composer from './components/Composer.svelte'
  import History from './components/History.svelte'
  import Footer from './components/Footer.svelte'
  import PawPrint from './components/PawPrint.svelte'

  let role: Role = 'human'
  let draft = ''
  let history: ChatTurn[] = []

  onMount(() => {
    history = loadHistory(HISTORY_KEY)
  })

  function send() {
    const content = draft.trim()
    if (!content) return

    const result = translate(content, role)
    const turn: ChatTurn = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role,
      original: content,
      translated: result.ok ? result.output : result.error ?? '',
      ok: result.ok,
      createdAt: Date.now(),
      stats: result.stats
    }

    const nextHistory = [turn, ...history].slice(0, HISTORY_LIMIT)
    history = nextHistory
    saveHistory(HISTORY_KEY, nextHistory)
    draft = ''
  }

  function clearHistory() {
    history = []
    saveHistory(HISTORY_KEY, [])
  }
</script>

<main class="page">
  <Hero />

  <section class="panel">
    <RoleSwitch bind:role />
    <Composer {role} bind:draft onSend={send} />
  </section>

  <History {history} onClear={clearHistory} />

  <Footer />
</main>

<PawPrint />
