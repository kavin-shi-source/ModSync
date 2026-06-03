<template>
  <div class="page-content">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title-group">
        <h2>同步管理</h2>
        <p>管理模板与服务端的文件差异和同步操作</p>
      </div>
      <el-button type="primary" @click="handleScanAll" :loading="scanning" size="default">
        <el-icon style="margin-right:4px"><Refresh /></el-icon>
        扫描全部
      </el-button>
    </div>

    <!-- 同步状态概要 -->
    <div class="status-bar-modern">
      <div class="status-item">
        <span class="status-label">同步状态</span>
        <span class="status-value">
          <span class="sync-dot" :class="{ syncing: syncing || scanning }"></span>
          {{ syncing ? '同步中...' : scanning ? '扫描中...' : store.syncStatus }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">总差异</span>
        <span class="status-value" :class="{ 'has-diff': store.totalDiffCount > 0 }">
          {{ store.totalDiffCount }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">服务器</span>
        <span class="status-value">{{ servers.length }}</span>
      </div>
    </div>

    <!-- 服务器差异标签页 -->
    <el-tabs v-model="activeTab" type="border-card" class="sync-tabs">
      <el-tab-pane
        v-for="server in servers"
        :key="server.id"
        :label="server.name"
        :name="server.id"
      >
        <template #label>
          <div class="tab-label">
            <span>{{ server.name }}</span>
            <el-tag
              v-if="(serverDiffs[server.id] || []).length > 0"
              size="small"
              type="warning"
              class="tab-badge"
            >
              {{ (serverDiffs[server.id] || []).length }}
            </el-tag>
          </div>
        </template>

        <div class="tab-content">
          <!-- 服务器信息栏 -->
          <div class="server-info-bar">
            <div class="server-info-left">
              <div class="server-avatar-sm">
                {{ server.name.charAt(0).toUpperCase() }}
              </div>
              <div class="server-info-text">
                <span class="server-info-name">{{ server.name }}</span>
                <span class="server-info-path">{{ server.path }}</span>
              </div>
            </div>
            <div class="server-info-actions">
              <el-button
                size="small"
                type="primary"
                plain
                @click="handleScanSingle(server)"
                :loading="scanningSingle === server.id"
              >
                <el-icon style="margin-right:3px"><Refresh /></el-icon>扫描
              </el-button>
              <el-button
                size="small"
                type="success"
                plain
                @click="handleSync(server)"
                :disabled="!serverDiffs[server.id] || serverDiffs[server.id].length === 0"
                :loading="syncingSingle === server.id"
              >
                <el-icon style="margin-right:3px"><Upload /></el-icon>同步
              </el-button>
            </div>
          </div>

          <!-- 差异树 -->
          <div v-if="serverDiffs[server.id] && serverDiffs[server.id].length > 0" class="diff-section">
            <DiffTree
              :ref="el => diffTreeRefs[server.id] = el"
              :diffs="serverDiffs[server.id]"
              :ignored-paths="ignoredPathsMap[server.id] || []"
              @ignore="handleIgnore(server.id, $event)"
              @unignore="handleUnignore(server.id, $event)"
              @batchIgnore="handleBatchIgnore(server.id, $event)"
            />
          </div>
          <div v-else class="empty-state-modern">
            <el-empty :description="`${server.name} 与模板完全一致，无需同步`" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { Refresh, Upload } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { showSuccess, showError } from '@/utils/feedback'
import { useProgress } from '@/utils/progress'
import { executeSync } from '@/utils/sync'
import DiffTree from '@/components/DiffTree.vue'

const store = useAppStore()

const servers = ref([])
const templatePath = ref('')
const serverDiffs = reactive({})
const scanning = ref(false)
const scanningSingle = ref('')
const syncing = ref(false)
const syncingSingle = ref('')
const activeTab = ref('')

// 忽略路径状态（按服务器）
const ignoredPathsMap = reactive({})
// DiffTree 组件引用
const diffTreeRefs = reactive({})

function handleIgnore(serverId, diff) {
  if (!ignoredPathsMap[serverId]) {
    ignoredPathsMap[serverId] = []
  }
  if (!ignoredPathsMap[serverId].includes(diff.relativePath)) {
    ignoredPathsMap[serverId].push(diff.relativePath)
  }
}

function handleUnignore(serverId, diff) {
  if (ignoredPathsMap[serverId]) {
    const idx = ignoredPathsMap[serverId].indexOf(diff.relativePath)
    if (idx !== -1) {
      ignoredPathsMap[serverId].splice(idx, 1)
    }
  }
}

function handleBatchIgnore(serverId, diffs) {
  if (!ignoredPathsMap[serverId]) {
    ignoredPathsMap[serverId] = []
  }
  for (const diff of diffs) {
    if (!ignoredPathsMap[serverId].includes(diff.relativePath)) {
      ignoredPathsMap[serverId].push(diff.relativePath)
    }
  }
}

async function loadData() {
  try {
    const config = await window.electronAPI.getConfig()
    templatePath.value = config.templatePath || ''
    servers.value = (await window.electronAPI.getServers()) || []
    if (servers.value.length > 0 && !activeTab.value) {
      activeTab.value = servers.value[0].id
    }
    scanAll(false)
  } catch (err) {
    showError('加载数据失败', err.message)
  }
}

async function scanSingle(server, showMessage = true) {
  if (!templatePath.value) {
    showError('请先配置模板路径')
    return
  }
  try {
    const result = await window.electronAPI.diffDirectories(templatePath.value, server.path, [])
    const diffs = [
      ...result.added.filter(f => f.type === 'templateOnly').map(f => ({ ...f, type: 'added', label: '新增', actionText: '推送到服务器' })),
      ...result.added.filter(f => f.type === 'serverOnly').map(f => ({ ...f, type: 'serverOnly', label: '服务器独有', actionText: '收集到模板' })),
      ...result.modified.map(f => ({ ...f, type: 'modified', label: '已修改', actionText: '推送到服务器' })),
    ]
    serverDiffs[server.id] = diffs
    store.refreshDiffCounts(serverDiffs)
    if (showMessage) showSuccess(`${server.name} 扫描完成`)
  } catch (err) {
    serverDiffs[server.id] = []
    showError(`扫描 ${server.name} 失败`, err.message)
  }
}

async function scanAll(showMessage = true) {
  if (!templatePath.value) {
    showError('请先配置模板路径')
    return
  }
  scanning.value = true
  for (const server of servers.value) {
    await scanSingle(server, false)
  }
  scanning.value = false
  if (showMessage) showSuccess('全部扫描完成')
}

async function handleScanAll() {
  scanning.value = true
  for (const server of servers.value) {
    scanningSingle.value = server.id
    await scanSingle(server, false)
  }
  scanningSingle.value = ''
  scanning.value = false
  showSuccess('全部扫描完成')
}

async function handleScanSingle(server) {
  scanningSingle.value = server.id
  await scanSingle(server)
  scanningSingle.value = ''
}

async function handleSync(server) {
  const diffs = serverDiffs[server.id] || []
  if (diffs.length === 0) return

  syncingSingle.value = server.id
  syncing.value = true

  const syncProgress = useProgress()

  const diffList = diffs.map(d => ({
    ...d,
    relativePath: d.relativePath,
    templateFile: d.templateFile,
    serverFile: d.serverFile,
    type: d.type
  }))

  const serverDiffsMap = { [server.id]: diffs }
  const syncingRef = ref(false)

  await executeSync(diffList, {
    servers: [server],
    serverDiffs: serverDiffsMap,
    templatePath: templatePath.value,
    syncing: syncingRef,
    syncProgress
  })

  syncingSingle.value = ''
  syncing.value = false

  await scanSingle(server, false)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title-group h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.page-title-group p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 状态栏 ===== */
.status-bar-modern {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 14px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.status-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.status-value.has-diff {
  color: var(--warning-color);
}

/* ===== 同步状态圆点 ===== */
.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color);
  display: inline-block;
}
.sync-dot.syncing {
  background: var(--warning-color);
  animation: pulse-dot 1.2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

/* ===== 标签页 ===== */
.sync-tabs {
  border-radius: var(--radius-md) !important;
  overflow: hidden;
  border: 1px solid var(--border-color) !important;
  background: var(--bg-card) !important;
  box-shadow: none !important;
}
.sync-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-color);
}
.sync-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 16px;
}
.sync-tabs :deep(.el-tabs__item) {
  height: 44px;
  line-height: 44px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.2s ease;
  border: none !important;
  background: transparent !important;
}
.sync-tabs :deep(.el-tabs__item:hover) {
  color: var(--primary-color);
  background: var(--bg-sidebar-hover) !important;
}
.sync-tabs :deep(.el-tabs__item.is-active) {
  color: var(--text-primary);
  font-weight: 600;
  background: var(--bg-card) !important;
}
.sync-tabs :deep(.el-tabs__active-bar) {
  background: var(--primary-color) !important;
}

/* Tab 标签 */
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tab-badge {
  padding: 0 5px !important;
  height: 18px !important;
  line-height: 18px !important;
  min-width: 18px;
  text-align: center;
  font-size: 11px;
  border-radius: 9px !important;
}

/* Tab 内容区 */
.tab-content {
  padding: 20px 24px;
}

/* ===== 服务器信息栏 ===== */
.server-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  transition: background 0.2s ease;
}
.server-info-bar:hover {
  background: var(--bg-sidebar-hover);
}
.server-info-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.server-avatar-sm {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}
.server-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.server-info-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.server-info-path {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'Consolas', 'Courier New', monospace;
}
.server-info-actions {
  display: flex;
  gap: 8px;
}

/* ===== 差异区 ===== */
.diff-section {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-card);
}

/* ===== 空状态覆盖 ===== */
.empty-state-modern {
  padding: 24px 0;
}
:deep(.el-empty) {
  padding: 24px 0;
}
:deep(.el-empty__description p) {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
