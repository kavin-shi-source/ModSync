<template>
  <Transition name="undo-fade">
    <div v-if="undoStore.currentUndo" class="undo-bar">
      <span class="undo-text">{{ undoStore.currentUndo.description }}</span>
      <el-button
        type="primary"
        size="small"
        link
        class="undo-btn"
        @click="handleUndo"
      >
        撤销
      </el-button>
      <el-button
        size="small"
        circle
        class="undo-close"
        @click="undoStore.clear()"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
  </Transition>
</template>

<script setup>
import { useUndoStore } from '@/stores/undo'
import { Close } from '@element-plus/icons-vue'

const undoStore = useUndoStore()

function handleUndo() {
  undoStore.undo()
}
</script>

<style scoped>
.undo-bar {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-sidebar, #304156);
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  color: #fff;
  font-size: 14px;
}

.undo-text {
  flex: 1;
  color: #e0e0e0;
}

.undo-btn {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.undo-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  font-size: 12px;
  color: #999;
  border: none;
  background: transparent;
}

.undo-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.undo-fade-enter-active,
.undo-fade-leave-active {
  transition: all 0.3s ease;
}

.undo-fade-enter-from,
.undo-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
