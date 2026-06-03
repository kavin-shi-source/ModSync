import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 撤销管理器
 * 支持 push/undo/clear，默认 5 秒自动过期
 */
export const useUndoStore = defineStore('undo', () => {
  const undoStack = ref([])
  const currentUndo = ref(null)
  let timer = null

  function push(action) {
    if (!action || typeof action.undo !== 'function') return
    clearTimer()

    undoStack.value.push({
      ...action,
      id: Date.now()
    })
    currentUndo.value = undoStack.value[undoStack.value.length - 1]

    timer = setTimeout(() => {
      clear()
    }, 5000)
  }

  function undo() {
    if (!currentUndo.value) return
    const action = undoStack.value.pop()
    if (action && typeof action.undo === 'function') {
      action.undo()
    }
    clearTimer()
    currentUndo.value = undoStack.value.length > 0
      ? undoStack.value[undoStack.value.length - 1]
      : null
    if (currentUndo.value) {
      timer = setTimeout(() => {
        clear()
      }, 5000)
    }
  }

  function clear() {
    clearTimer()
    currentUndo.value = null
  }

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    undoStack,
    currentUndo,
    push,
    undo,
    clear
  }
})
