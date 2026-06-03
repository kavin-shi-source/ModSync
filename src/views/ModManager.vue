<template>
  <div class="page-content">
    <div class="page-header">
      <div class="page-title-group">
        <h2>
          模组管理
          <el-tag v-if="serverName" size="small" class="server-tag" effect="plain">
            {{ serverName }}
          </el-tag>
        </h2>
        <p>管理当前服务端的所有模组，支持启用、禁用、删除等操作</p>
      </div>
      <div class="header-actions">
        <el-button @click="scanMods" class="action-btn-outline">
          <el-icon class="btn-icon"><Refresh /></el-icon>
          重新扫描
        </el-button>
        <el-button type="primary" @click="onOpenModsFolder" class="action-btn-primary">
          <el-icon class="btn-icon"><FolderOpened /></el-icon>
          打开 mods 文件夹
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrap stat-icon-primary">
          <el-icon :size="22"><Box /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">模组总数</span>
          <span class="stat-number">{{ mods.length }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap stat-icon-success">
          <el-icon :size="22"><SuccessFilled /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">已启用</span>
          <span class="stat-number stat-number-success">{{ enabledCount }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap stat-icon-danger">
          <el-icon :size="22"><RemoveFilled /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">已禁用</span>
          <span class="stat-number stat-number-danger">{{ disabledCount }}</span>
        </div>
      </div>
    </div>

    <!-- 搜索与筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-input
          v-model="searchQuery"
          placeholder="搜索模组名称..."
          clearable
          prefix-icon="Search"
          class="search-input"
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable class="status-select">
          <el-option label="全部" value="" />
          <el-option label="已启用" value="enabled" />
          <el-option label="已禁用" value="disabled" />
        </el-select>
      </div>
      <div class="filter-right">
        <span class="filter-hint" v-if="searchQuery || statusFilter">
          筛选出 {{ filteredMods.length }} / {{ mods.length }} 个模组
        </span>
      </div>
    </div>

    <!-- 模组列表 -->
    <div class="table-card">
      <ModList
        :mods="filteredMods"
        @toggle="toggleMod"
        @delete="deleteMod"
        @batch-enable="batchEnable"
        @batch-disable="batchDisable"
        @batch-delete="batchDelete"
        @open-folder="openModFolder"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { confirmDelete, confirmBatch } from '@/utils/confirm'
import { showSuccess, showError } from '@/utils/feedback'
import ModList from '@/components/ModList.vue'
import { Refresh, FolderOpened, Box, SuccessFilled, RemoveFilled } from '@element-plus/icons-vue'

const route = useRoute()
const serverId = computed(() => route.params.id)
const serverName = ref('')
const serverPath = ref('')
// 使用 shallowRef 避免对数组内每个对象进行深度响应式代理，大幅降低大列表渲染开销
const mods = shallowRef([])
const store = useAppStore()

// ---- 搜索与筛选 ----
const searchQuery = ref('')
const statusFilter = ref('')

const enabledCount = computed(() => mods.value.filter(m => m.enabled).length)
const disabledCount = computed(() => mods.value.filter(m => !m.enabled).length)

const filteredMods = computed(() => {
  let list = mods.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m => m.displayName.toLowerCase().includes(q) || m.fileName.toLowerCase().includes(q))
  }
  if (statusFilter.value === 'enabled') {
    list = list.filter(m => m.enabled)
  } else if (statusFilter.value === 'disabled') {
    list = list.filter(m => !m.enabled)
  }
  return list
})

// ---- 扫描 ----
async function scanMods() {
  if (!window.electronAPI) return
  if (!serverPath.value) { mods.value = []; return }
  const modsDir = `${serverPath.value}/mods`
  try {
    const files = await window.electronAPI.readDirectory(modsDir)
    const modList = []
    for (const file of files) {
      if (file.type === 'file' && (file.name.endsWith('.jar') || file.name.endsWith('.jar.disabled'))) {
        const isDisabled = file.name.endsWith('.disabled')
        const cleanName = isDisabled ? file.name.replace('.disabled', '') : file.name
        modList.push({
          fileName: file.name,
          displayName: cleanName.replace(/-\d[\w.+\-]*\.jar$/, ''),
          version: (cleanName.match(/-(\d[\w.+\-]*)\.jar$/) || ['', ''])[1],
          enabled: !isDisabled,
          path: file.path,
        })
      }
    }
    mods.value = modList
    await nextTick()
    showSuccess(`扫描完成，共 ${modList.length} 个模组`)
  } catch (err) {
    console.error('[scanMods] 扫描失败:', err)
    showError('扫描模组失败', err.message)
    mods.value = []
  }
}

// ---- 切换启用/禁用 ----
async function toggleMod(mod) {
  const oldPath = mod.path
  const newPath = mod.enabled
    ? oldPath.replace('.jar', '.jar.disabled')
    : oldPath.replace('.jar.disabled', '.jar')
  try {
    const result = await window.electronAPI.renameFile(oldPath, newPath)
    if (result) {
      mod.enabled = !mod.enabled
      mod.path = newPath
      mod.fileName = mod.enabled
        ? mod.fileName.replace('.disabled', '')
        : mod.fileName.endsWith('.disabled') ? mod.fileName : mod.fileName + '.disabled'
    } else {
      showError('操作失败')
    }
  } catch (err) {
    showError('操作失败', err.message || err)
  }
}

// ---- 删除 ----
async function deleteMod(mod) {
  const confirmed = await confirmDelete('确认删除', `确定删除 ${mod.fileName}？`)
  if (!confirmed) return
  try {
    const result = await window.electronAPI.deleteFile(mod.path)
    if (result) {
      mods.value = mods.value.filter(m => m.path !== mod.path)
      showSuccess('已删除')
    } else {
      showError('删除失败')
    }
  } catch (err) {
    showError('删除失败', err.message || err)
  }
}

// ---- 右键打开文件夹 ----
function openModFolder(mod) {
  if (window.electronAPI && window.electronAPI.openFolder) {
    window.electronAPI.openFolder(mod.path)
  }
}

// ---- 打开 mods 目录 ----
function onOpenModsFolder() {
  if (window.electronAPI && window.electronAPI.openFolder && serverPath.value) {
    window.electronAPI.openFolder(`${serverPath.value}/mods`)
  }
}

// ---- 批量操作 ----
async function batchEnable(selectedMods) {
  let success = 0
  let fail = 0
  for (const mod of selectedMods) {
    if (mod.enabled) { success++; continue }
    const oldPath = mod.path
    const newPath = oldPath.replace('.jar.disabled', '.jar')
    try {
      const result = await window.electronAPI.renameFile(oldPath, newPath)
      if (result) {
        mod.enabled = true
        mod.path = newPath
        mod.fileName = mod.fileName.replace('.disabled', '')
        success++
      } else { fail++ }
    } catch { fail++ }
  }
  showSuccess(`批量启用完成: ${success} 成功, ${fail} 失败`)
}

async function batchDisable(selectedMods) {
  let success = 0
  let fail = 0
  for (const mod of selectedMods) {
    if (!mod.enabled) { success++; continue }
    const oldPath = mod.path
    const newPath = oldPath.replace('.jar', '.jar.disabled')
    try {
      const result = await window.electronAPI.renameFile(oldPath, newPath)
      if (result) {
        mod.enabled = false
        mod.path = newPath
        mod.fileName = mod.fileName.endsWith('.disabled') ? mod.fileName : mod.fileName + '.disabled'
        success++
      } else { fail++ }
    } catch { fail++ }
  }
  showSuccess(`批量禁用完成: ${success} 成功, ${fail} 失败`)
}

async function batchDelete(selectedMods) {
  const confirmed = await confirmBatch('确认批量删除', selectedMods.length, `确定删除选中的 ${selectedMods.length} 个模组？`)
  if (!confirmed) return
  let success = 0
  let fail = 0
  for (const mod of selectedMods) {
    try {
      const result = await window.electronAPI.deleteFile(mod.path)
      if (result) {
        mods.value = mods.value.filter(m => m.path !== mod.path)
        success++
      } else { fail++ }
    } catch { fail++ }
  }
  showSuccess(`批量删除完成: ${success} 成功, ${fail} 失败`)
}

// ---- 初始化 ----
onMounted(async () => {
  if (window.electronAPI) {
    const servers = await window.electronAPI.getServers()
    const server = servers.find(s => s.id === serverId.value)
    if (server) {
      serverName.value = server.name
      serverPath.value = server.path
      await scanMods()
    }
  }
})
</script>

<style scoped>
.page-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: var(--bg-primary);
  min-height: 100%;
  box-sizing: border-box;
}

/* ====== Page Header ====== */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title-group h2 {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title-group p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.server-tag {
  font-size: 12px;
  padding: 0 10px;
  height: 24px;
  line-height: 24px;
  border-radius: 12px;
  border-color: var(--border-color);
  color: var(--text-secondary);
  background: var(--bg-card);
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-self: flex-start;
}

.btn-icon {
  margin-right: 4px;
  font-size: 14px;
}

.action-btn-outline {
  border-color: var(--border-color);
  color: var(--text-primary);
  background: var(--bg-card);
  border-radius: 8px;
  font-size: 13px;
  height: 36px;
  padding: 0 16px;
}

.action-btn-outline:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-light);
}

.action-btn-primary {
  border-radius: 8px;
  font-size: 13px;
  height: 36px;
  padding: 0 16px;
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.action-btn-primary:hover {
  opacity: 0.9;
}

/* ====== Stats Grid ====== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: box-shadow 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.stat-icon-wrap {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-icon-primary {
  background: var(--primary-light);
  color: var(--primary-color);
}

.stat-icon-success {
  background: var(--success-light);
  color: var(--success-color);
}

.stat-icon-danger {
  background: #fef2f2;
  color: var(--danger-color);
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.stat-number-success {
  color: var(--success-color);
}

.stat-number-danger {
  color: var(--danger-color);
}

/* ====== Filter Bar ====== */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  width: 260px;
}

.status-select {
  width: 130px;
}

:deep(.search-input .el-input__wrapper),
:deep(.status-select .el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--border-color) inset;
  background: var(--bg-card);
}

:deep(.search-input .el-input__inner),
:deep(.status-select .el-input__inner) {
  height: 36px;
  font-size: 13px;
  color: var(--text-primary);
}

:deep(.search-input .el-input__inner::placeholder),
:deep(.status-select .el-input__inner::placeholder) {
  color: var(--text-muted);
}

.filter-hint {
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ====== Table Card ====== */
.table-card {
  flex: 1;
  overflow: hidden;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

:deep(.el-table) {
  --el-table-border-color: var(--border-color);
  --el-table-header-bg-color: #f9fafb;
  --el-table-row-hover-bg-color: var(--primary-light);
  --el-table-text-color: var(--text-primary);
  --el-table-header-text-color: var(--text-secondary);
  border: none;
  border-radius: 10px;
  font-size: 13px;
}

:deep(.el-table th.el-table__cell) {
  background: #f9fafb !important;
  font-weight: 600 !important;
  color: var(--text-secondary) !important;
  font-size: 12px !important;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 1px solid var(--border-color) !important;
}

:deep(.el-table__row) {
  transition: background-color 0.15s ease;
}

:deep(.el-table__row > td) {
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

:deep(.el-table__row:hover > td) {
  background: var(--primary-light) !important;
}

:deep(.el-table__body tr.current-row > td) {
  background: var(--primary-light) !important;
}
</style>
