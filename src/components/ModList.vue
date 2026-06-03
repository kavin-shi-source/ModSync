<template>
  <div class="mod-list">
    <div class="toolbar">
      <el-input v-model="search" placeholder="搜索模组..." clearable style="width:240px" />
      <el-select v-model="statusFilter" placeholder="状态" clearable style="width:120px">
        <el-option label="全部" value="" />
        <el-option label="已启用" value="enabled" />
        <el-option label="已禁用" value="disabled" />
        <el-option label="可更新" value="hasUpdate" />
      </el-select>
      <el-select v-model="sourceFilter" placeholder="来源" clearable style="width:120px">
        <el-option label="全部" value="" />
        <el-option label="模板" value="template" />
        <el-option label="专属" value="server-only" />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="$emit('install')">从 Modrinth 安装</el-button>
    </div>
    <el-table :data="filteredMods" style="width:100%" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="fileName" label="文件名" min-width="200" />
      <el-table-column prop="displayName" label="模组名称" width="160" />
      <el-table-column prop="version" label="版本" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.hasUpdate" type="warning" size="small">可更新</el-tag>
          <el-tag v-else-if="!row.enabled" type="info" size="small">已禁用</el-tag>
          <el-tag v-else type="success" size="small">已启用</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="source" label="来源" width="80" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="$emit('toggle', row)">
            {{ row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" type="warning" @click="$emit('update', row)" :disabled="!row.modrinthId">
            更新
          </el-button>
          <el-button size="small" type="danger" @click="$emit('delete', row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  mods: { type: Array, default: () => [] },
})
const emit = defineEmits(['install', 'toggle', 'update', 'delete', 'selectionChange'])

const search = ref('')
const statusFilter = ref('')
const sourceFilter = ref('')

const filteredMods = computed(() => {
  return props.mods.filter(mod => {
    if (search.value && !mod.fileName.toLowerCase().includes(search.value.toLowerCase())) return false
    if (statusFilter.value === 'enabled' && !mod.enabled) return false
    if (statusFilter.value === 'disabled' && mod.enabled) return false
    if (statusFilter.value === 'hasUpdate' && !mod.hasUpdate) return false
    if (sourceFilter.value && mod.source !== sourceFilter.value) return false
    return true
  })
})

function onSelectionChange(selection) {
  emit('selectionChange', selection)
}
</script>

<style scoped>
.toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
</style>
