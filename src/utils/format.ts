/**
 * 格式化时间戳为可读字符串
 */
export function formatTimestamp(value: number): string {
  const d = new Date(value)
  const pad = (input: number) => input.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`
}
