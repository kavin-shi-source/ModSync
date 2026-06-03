<template>
  <div class="sync-diff">
    <div v-if="diffs.length === 0" class="empty">✅ 所有服务器与模板保持一致</div>
    <div v-for="diff in diffs" :key="diff.relativePath" class="diff-item">
      <div class="diff-header">
        <el-tag :type="diffTagType(diff.type)" size="small">{{ diff.label }}</el-tag>
        <span class="diff-path">{{ diff.relativePath }}</span>
      </div>
      <div class="diff-actions">
        <el-button size="small" @click="handleAction(diff)">{{ diff.actionText }}</el-button>
        <el-button v-if="diff.type === 'conflicted'" size="small" @click="showConflictDetail(diff)">
          查看差异
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  diffs: { type: Array, default: () => [] },
})
const emit = defineEmits(['action', 'showConflict'])

function diffTagType(type) {
  return { added: 'success', modified: 'warning', deleted: 'danger', conflicted: 'danger', serverOnly: 'info' }[type] || 'info'
}

function handleAction(diff) {
  emit('action', diff)
}

function showConflictDetail(diff) {
  emit('showConflict', diff)
}
</script>

<style scoped>
.diff-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid #f0f0f0;
}
.diff-header { display: flex; align-items: center; gap: 8px; }
.diff-path { font-family: monospace; font-size: 13px; }
.empty { text-align: center; padding: 40px; color: #67c23a; font-size: 16px; }
</style>
