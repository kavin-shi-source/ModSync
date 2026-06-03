<template>
  <div class="mod-list">
    <!-- 批量操作栏 -->
    <div v-if="selectedMods.length > 0" class="batch-bar">
      <span class="batch-hint">已选中 {{ selectedMods.length }} 个模组</span>
      <el-button size="small" type="success" @click="$emit('batchEnable', selectedMods)">批量启用</el-button>
      <el-button size="small" type="warning" @click="$emit('batchDisable', selectedMods)">批量禁用</el-button>
      <el-button size="small" type="danger" @click="$emit('batchDelete', selectedMods)">批量删除</el-button>
      <el-button size="small" @click="clearSelection">取消选择</el-button>
    </div>

    <el-table
      ref="tableRef"
      :data="mods"
      style="width:100%"
      @selection-change="onSelectionChange"
      @row-contextmenu="onRowContextMenu"
      height="100%"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column label="文件名" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.enabled" class="mod-name">{{ row.fileName }}</span>
          <span v-else class="mod-name disabled-mod">{{ row.fileName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.enabled" size="small" type="success">启用</el-tag>
          <el-tag v-else size="small" type="info">禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="版本" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.version || '-' }}</template>
      </el-table-column>

      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" :type="row.enabled ? 'warning' : 'success'"
            @click="$emit('toggle', row)">
            {{ row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button text size="small" type="danger" @click="$emit('delete', row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 右键菜单 -->
    <div
      v-show="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-item" @click="onToggleMod" v-if="contextMenu.mod">
        {{ contextMenu.mod.enabled ? '禁用' : '启用' }}
      </div>
      <div class="context-item" @click="onDeleteMod">删除</div>
      <div class="context-divider"></div>
      <div class="context-item" @click="onOpenFolder">打开所在文件夹</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  mods: { type: Array, default: () => [] }
})
const emit = defineEmits(['toggle', 'delete', 'batchEnable', 'batchDisable', 'batchDelete', 'openFolder'])

const tableRef = ref(null)
const selectedMods = ref([])
const contextMenu = reactive({ visible: false, x: 0, y: 0, mod: null })

function onSelectionChange(selection) {
  selectedMods.value = selection
}

function clearSelection() {
  if (tableRef.value) tableRef.value.clearSelection()
  selectedMods.value = []
}

function onRowContextMenu(row, _column, event) {
  event.preventDefault()
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.mod = row
}

function onToggleMod() {
  if (contextMenu.mod) {
    emit('toggle', contextMenu.mod)
  }
  hideContextMenu()
}

function onDeleteMod() {
  if (contextMenu.mod) {
    emit('delete', contextMenu.mod)
  }
  hideContextMenu()
}

function onOpenFolder() {
  if (contextMenu.mod) {
    emit('openFolder', contextMenu.mod)
  }
  hideContextMenu()
}

function hideContextMenu() {
  contextMenu.visible = false
  contextMenu.mod = null
}

function onGlobalClick() {
  if (contextMenu.visible) hideContextMenu()
}

onMounted(() => document.addEventListener('click', onGlobalClick))
onUnmounted(() => document.removeEventListener('click', onGlobalClick))
</script>

<style scoped>
.mod-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 4px;
  border: 1px solid #d9ecff;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.batch-hint {
  font-size: 13px;
  color: #409eff;
  margin-right: auto;
}
.mod-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 400px;
}
.mod-name.disabled-mod {
  color: #999;
  text-decoration: line-through;
}
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  min-width: 140px;
  padding: 4px 0;
}
.context-item {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}
.context-item:hover {
  background: #f5f7fa;
  color: #409eff;
}
.context-divider {
  height: 1px;
  background: #e4e7ed;
  margin: 4px 0;
}
:deep(.el-table .el-table__body-wrapper) {
  overflow-y: auto;
}
:deep(.el-table__row) {
  height: 36px;
}
:deep(.el-table__cell) {
  padding: 4px 0 !important;
}
</style>
