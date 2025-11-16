/**
 * 复制文本到剪贴板
 */
export async function copyText(text?: string): Promise<void> {
  const payload = text?.trim()
  if (!payload) {
    return
  }

  try {
    // 优先使用 Clipboard API (现代浏览器)
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
      return
    }
  } catch (error) {
    console.warn('Clipboard API copy failed', error)
  }

  // 降级方案：使用 execCommand (兼容 iOS Safari 等旧版本)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = payload
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)

    // 选中文本
    textArea.select()
    textArea.setSelectionRange(0, payload.length)

    // 执行复制命令
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (!successful) {
      console.warn('execCommand copy failed')
    }
  } catch (error) {
    console.warn('Fallback copy method failed', error)
  }
}

/**
 * 从剪贴板粘贴文本
 */
export async function pasteText(): Promise<string> {
  try {
    // 优先使用 Clipboard API (现代浏览器)
    if (navigator?.clipboard?.readText) {
      return await navigator.clipboard.readText()
    }
  } catch (error) {
    console.warn('Clipboard API paste failed', error)
  }

  // 降级方案：创建临时输入框让用户粘贴
  try {
    const textArea = document.createElement('textarea')
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)

    // 获取焦点
    textArea.focus()

    // 执行粘贴命令
    const successful = document.execCommand('paste')

    if (successful) {
      const pastedText = textArea.value
      document.body.removeChild(textArea)
      return pastedText
    }

    document.body.removeChild(textArea)
    return ''
  } catch (error) {
    console.warn('Fallback paste method failed', error)
    return ''
  }
}

/**
 * 触发震动反馈
 */
export function vibrate(duration: number): void {
  try {
    if ('vibrate' in navigator && navigator.vibrate) {
      navigator.vibrate(duration)
    }
  } catch (error) {
    console.warn('Vibration API failed:', error)
  }
}
