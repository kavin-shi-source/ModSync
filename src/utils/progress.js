import { ref } from 'vue'

export function useProgress() {
  const showProgress = ref(false)
  const progress = ref(0)
  const progressText = ref('')
  const current = ref(0)
  const total = ref(0)

  function start(text, totalCount) {
    showProgress.value = true
    progress.value = 0
    current.value = 0
    total.value = totalCount
    progressText.value = text
  }

  function update(step = 1) {
    current.value += step
    progress.value = Math.round((current.value / total.value) * 100)
    progressText.value = `正在处理：${current.value} / ${total.value}`
  }

  function complete(finalText) {
    progress.value = 100
    progressText.value = finalText || '处理完成'
    setTimeout(() => { showProgress.value = false }, 1500)
  }

  function reset() {
    showProgress.value = false
    progress.value = 0
    current.value = 0
    total.value = 0
  }

  return { showProgress, progress, progressText, current, total, start, update, complete, reset }
}
