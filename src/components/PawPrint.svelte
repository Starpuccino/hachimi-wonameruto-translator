<script lang="ts">
  import { onMount } from 'svelte'
  import pawPrintsSvg from '../assets/paw-prints.svg'
  import { vibrate } from '../utils/clipboard';

  interface Paw {
    id: number
    x: number
    y: number
    rotation: number
  }

  let paws: Paw[] = []
  let nextId = 0
  let lastClickTime = 0
  const CLICK_THROTTLE = 200

  function handleClick(event: MouseEvent | TouchEvent) {
    const now = Date.now()
    if (now - lastClickTime < CLICK_THROTTLE) {
      return
    }
    lastClickTime = now

    let x: number, y: number

    if (event instanceof MouseEvent) {
      x = event.clientX
      y = event.clientY
    } else {
      const touch = event.touches[0] || event.changedTouches[0]
      x = touch.clientX
      y = touch.clientY
    }

    const id = nextId++
    const rotation = Math.random() * 120 - 60 // -60 到 60 度随机角度
    paws = [...paws, { id, x, y, rotation }]

    vibrate(10) // 触发震动反馈

    // 5秒后移除脚印
    setTimeout(() => {
      paws = paws.filter(p => p.id !== id)
    }, 5000)
  }

  onMount(() => {
    document.addEventListener('click', handleClick, true)
    document.addEventListener('touchend', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('touchend', handleClick, true)
    }
  })
</script>

{#each paws as paw (paw.id)}
  <div
    class="paw-print"
    style="left: {paw.x}px; top: {paw.y}px; --rotation: {paw.rotation}deg;"
  >
    <img src={pawPrintsSvg} alt="paw" />
  </div>
{/each}

<style>
  .paw-print {
    position: fixed;
    pointer-events: none;
    width: 36px;
    height: 36px;
    transform: translate(-50%, -50%) rotate(var(--rotation));
    animation: pawFade 3s ease-out forwards;
    z-index: 9999;
  }

  .paw-print img {
    width: 100%;
    height: 100%;
  }

  @keyframes pawFade {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--rotation)) scale(0.5);
    }
    10% {
      opacity: 0.5;
      transform: translate(-50%, -50%) rotate(var(--rotation)) scale(1);
    }
    40% {
      opacity: 0.5;
      transform: translate(-50%, -50%) rotate(var(--rotation)) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(var(--rotation)) scale(0.8);
    }
  }
</style>
