<script lang="ts">
  import type { Role } from '../types'
  import { roleCopy } from '../constants'
  import catSpiderGif from '../assets/cat-spider.gif'

  export let role: Role

  function handleRoleChange(newRole: Role) {
    role = newRole
  }
</script>

<div class="role-switch">
  <div class="toggle" class:role-human={role === 'human'} class:role-hachimi={role === 'hachimi'}>
    {#each Object.entries(roleCopy) as [key, info]}
      <button
        type="button"
        class:selected={role === key}
        on:click={() => handleRoleChange(key as Role)}
        aria-pressed={role === key}
      >
        <span class="emoji">{info.emoji}</span>
        {info.label}
      </button>
    {/each}
  </div>
  <img src={catSpiderGif} alt="" class="cat-spider-gif" />
</div>
