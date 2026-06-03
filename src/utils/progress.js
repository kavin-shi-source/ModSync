import { ref } from 'vue'

let rafId = null

export function useProgress() {
  const showProgress = ref(false)
  const progress = ref(0)
  const progressText = ref('')

  // 用普通变量做实际计数，通过 requestAnimationFrame 节流同步到响应式 ref
  let _current = 0
  let _total = 0
  let _pendingUpdate = false

  function flushToReactive() {
    progress.value = _total > 0 ? Math.round((_current / _total) * 100) : 0
    progressText.value = `正在处理：${_current} / ${_total}`
    _pendingUpdate = false
    rafId = null
  }

  function scheduleUpdate() {
    if (!_pendingUpdate) {
      _pendingUpdate = true
      // 使用 requestAnimationFrame 节流，保证最多每帧(16ms)同步一次到响应式 ref
      rafId = requestAnimationFrame(flushToReactive)
    }
  }

  function start(text, totalCount) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    _current = 0
    _total = totalCount
    showProgress.value = true
    progress.value = 0
    progressText.value = text
    _pendingUpdate = false
  }

  function update(step = 1) {
    _current += step
    scheduleUpdate()
  }

  function complete(finalText) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    _current = _total
    progress.value = 100
    progressText.value = finalText || '处理完成'
    _pendingUpdate = false
    setTimeout(() => { showProgress.value = false }, 1500)
  }

  function reset() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    _current = 0
    _total = 0
    showProgress.value = false
    progress.value = 0
    _pendingUpdate = false
  }

  return { showProgress, progress, progressText, start, update, complete, reset }
}
