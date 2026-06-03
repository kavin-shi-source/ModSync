<template>
  <div class="page-content">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title-group">
        <h2>{{ pageTitle }}</h2>
        <p>服务器模组同步概览</p>
      </div>
      <div class="header-actions">
        <el-button
          type="primary"
          size="large"
          @click="openWizard"
          :disabled="!hasTemplateAndServers"
        >
          <el-icon style="margin-right:6px"><Refresh /></el-icon>开始同步
        </el-button>
      </div>
    </div>

    <!-- 快速同步 / 引导卡片 -->
    <div v-if="hasTemplateAndServers" class="quick-sync-banner">
      <div class="quick-sync-content">
        <div class="quick-sync-icon-wrap">
          <el-icon :size="24"><Refresh /></el-icon>
        </div>
        <div class="quick-sync-text">
          <h3>快速同步</h3>
          <p>三步完成服务器同步：选择服务器 → 预览差异 → 执行同步</p>
        </div>
      </div>
      <el-button class="quick-sync-btn" type="primary" @click="openWizard">
        开始同步
      </el-button>
    </div>
    <div v-else class="guide-card">
      <el-alert
        title="开始使用"
        type="info"
        :description="guideMessage"
        show-icon
        :closable="false"
        size="large"
      />
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card-modern">
        <div class="stat-icon-wrap stat-icon-blue">
          <el-icon :size="24"><Monitor /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">服务器数量</span>
          <span class="stat-number">{{ servers.length }}</span>
        </div>
      </div>
      <div class="stat-card-modern">
        <div class="stat-icon-wrap stat-icon-orange">
          <el-icon :size="24"><Refresh /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">总差异数</span>
          <span class="stat-number" :class="{ 'has-diff': store.totalDiffCount > 0 }">
            {{ store.totalDiffCount }}
          </span>
        </div>
      </div>
      <div class="stat-card-modern">
        <div class="stat-icon-wrap stat-icon-green">
          <el-icon :size="24"><DataBoard /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">最后扫描</span>
          <span class="stat-number time">{{ lastScanTime }}</span>
        </div>
      </div>
    </div>

    <!-- 同步状态栏 -->
    <div class="status-bar-modern">
      <div class="status-item">
        <span class="status-label">已配置服务器</span>
        <span class="status-value">{{ servers.length }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">总差异数</span>
        <span class="status-value" :class="{ 'has-diff': store.totalDiffCount > 0 }">
          {{ store.totalDiffCount }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">最后扫描</span>
        <span class="status-value">{{ lastScanTime }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">模板路径</span>
        <span class="status-value path">{{ templatePath || '未配置' }}</span>
      </div>
    </div>

    <!-- 服务器概览 -->
    <div v-if="servers.length > 0" class="server-section">
      <div class="section-header">
        <h3>服务器概览</h3>
        <div class="section-actions">
          <el-button size="small" text @click="scanAll" :loading="scanning">
            <el-icon style="margin-right:4px"><Refresh /></el-icon>扫描全部
          </el-button>
          <el-button
            size="small"
            type="success"
            :disabled="store.totalDiffCount === 0"
            :loading="syncingAll"
            @click="syncAll"
          >
            <el-icon style="margin-right:4px"><Upload /></el-icon>同步全部
          </el-button>
        </div>
      </div>

      <div
        v-for="server in servers"
        :key="server.id"
        class="server-card"
      >
        <div class="server-card-inner">
          <div class="server-card-main">
            <div class="server-avatar">
              <span>{{ server.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="server-info">
              <span class="server-name">{{ server.name }}</span>
              <p class="server-path" :title="server.path">{{ server.path }}</p>
            </div>
          </div>
          <el-tag
            :type="getServerDiffCount(server.id) > 0 ? 'warning' : 'success'"
            size="small"
            effect="dark"
          >
            {{ getServerDiffCount(server.id) > 0 ? `${getServerDiffCount(server.id)} 处差异` : '已同步' }}
          </el-tag>
        </div>

        <div v-if="getServerDiffs(server.id).length > 0" class="server-diff-badges">
          <el-tag v-if="getDiffCountByType(server.id, 'added')" size="small" type="success">
            + 新增 {{ getDiffCountByType(server.id, 'added') }}
          </el-tag>
          <el-tag v-if="getDiffCountByType(server.id, 'modified')" size="small" type="warning">
            ~ 修改 {{ getDiffCountByType(server.id, 'modified') }}
          </el-tag>
          <el-tag v-if="getDiffCountByType(server.id, 'serverOnly')" size="small" type="info">
            ● 独有 {{ getDiffCountByType(server.id, 'serverOnly') }}
          </el-tag>
        </div>

        <div class="server-card-footer">
          <span class="server-last-sync">
            <el-icon :size="12"><Timer /></el-icon>
            最后同步: {{ getServer(server.id)?.lastSync || '从未' }}
          </span>
          <div class="server-card-actions">
            <el-button size="small" text @click="goToServer(server.id)">查看详情</el-button>
            <el-button size="small" type="primary" plain @click="syncServer(server.id)">同步</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state-modern">
      <el-empty description="暂无服务器，请先在设置中添加服务器" />
    </div>

    <!-- QuickSync 向导 -->
    <SyncWizard
      v-if="showWizard"
      :servers="servers"
      :template-path="templatePath"
      :server-diffs="dashboardDiffs"
      @close="showWizard = false"
      @done="onSyncDone"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Monitor, DataBoard, Timer, Upload } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { showSuccess, showError } from '@/utils/feedback'
import { useProgress } from '@/utils/progress'
import { executeSync } from '@/utils/sync'
import SyncWizard from '@/components/SyncWizard.vue'

const pageTitle = ref('仪表盘')

const router = useRouter()
const store = useAppStore()

const servers = ref([])
const templatePath = ref('')
const serverDiffs = reactive({})
const scanning = ref(false)
const syncingAll = ref(false)
const loading = ref(true)
const showWizard = ref(false)

const dashboardDiffs = computed(() => ({ ...serverDiffs }))

const hasTemplateAndServers = computed(() =>
  templatePath.value && servers.value.length > 0
)

const guideMessage = computed(() => {
  if (!templatePath.value && servers.value.length === 0) {
    return '请先在设置中配置模板路径并添加服务器'
  }
  if (!templatePath.value) {
    return '请先在设置中配置模板路径'
  }
  if (servers.value.length === 0) {
    return '请先在设置中添加服务器'
  }
  return ''
})

const lastScanTime = computed(() => {
  const data = store.dashboardData
  return data?.lastScanTime || '尚未扫描'
})

function getServer(id) {
  return servers.value.find(s => s.id === id)
}

function getServerDiffCount(serverId) {
  return (serverDiffs[serverId] || []).length
}

function getServerDiffs(serverId) {
  return serverDiffs[serverId] || []
}

function getDiffCountByType(serverId, type) {
  return (serverDiffs[serverId] || []).filter(d => d.type === type).length
}

function goToServer(id) {
  router.push(`/server/${id}`)
}

async function loadData() {
  loading.value = true
  try {
    const config = await window.electronAPI.getConfig()
    templatePath.value = config.templatePath || ''
    servers.value = (await window.electronAPI.getServers()) || []

    if (store.dashboardData) {
      Object.assign(serverDiffs, store.dashboardData.cachedDiffs || {})
    }
  } catch (err) {
    showError('加载数据失败', err.message)
  }
  loading.value = false
}

async function scanAll() {
  if (!templatePath.value) {
    showError('请先配置模板路径')
    return
  }
  scanning.value = true
  const newDiffs = {}
  for (const server of servers.value) {
    try {
      const result = await window.electronAPI.diffDirectories(templatePath.value, server.path, [])
      newDiffs[server.id] = [
        ...result.added.filter(f => f.type === 'templateOnly').map(f => ({ ...f, type: 'added', label: '新增', actionText: '推送到服务器' })),
        ...result.added.filter(f => f.type === 'serverOnly').map(f => ({ ...f, type: 'serverOnly', label: '服务器独有', actionText: '收集到模板' })),
        ...result.modified.map(f => ({ ...f, type: 'modified', label: '已修改', actionText: '推送到服务器' })),
      ]
    } catch (err) {
      newDiffs[server.id] = []
      showError(`扫描 ${server.name} 失败`, err.message)
    }
  }
  Object.assign(serverDiffs, newDiffs)
  store.refreshDiffCounts(serverDiffs)
  store.updateDashboardData({
    lastScanTime: new Date().toLocaleString(),
    cachedDiffs: { ...newDiffs }
  })
  scanning.value = false
  showSuccess('扫描完成')
}

async function syncServer(serverId) {
  const diffs = serverDiffs[serverId] || []
  if (diffs.length === 0) return

  const syncing = ref(false)
  const syncProgress = useProgress()
  const server = servers.value.find(s => s.id === serverId)
  if (!server) return

  const diffList = diffs.map(d => ({
    ...d,
    relativePath: d.relativePath,
    templateFile: d.templateFile,
    serverFile: d.serverFile,
    type: d.type
  }))

  const serverDiffsMap = { [serverId]: diffs }

  await executeSync(diffList, {
    servers: [server],
    serverDiffs: serverDiffsMap,
    templatePath: templatePath.value,
    syncing,
    syncProgress
  })

  await scanAll()
}

async function syncAll() {
  if (store.totalDiffCount === 0) return

  try {
    const { ElMessageBox } = await import('element-plus')
    await ElMessageBox.confirm(
      '即将同步所有有差异的服务器，此操作不可撤销。确认继续？',
      '同步全部',
      { confirmButtonText: '确认同步', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  const syncing = ref(false)
  const syncProgress = useProgress()

  syncingAll.value = true
  let allDiffs = []
  for (const server of servers.value) {
    allDiffs = allDiffs.concat(serverDiffs[server.id] || [])
  }

  const diffList = allDiffs.map(d => ({
    ...d,
    relativePath: d.relativePath,
    templateFile: d.templateFile,
    serverFile: d.serverFile,
    type: d.type
  }))

  await executeSync(diffList, {
    servers: servers.value,
    serverDiffs,
    templatePath: templatePath.value,
    syncing,
    syncProgress
  })

  syncingAll.value = false
  await scanAll()
}

function openWizard() {
  showWizard.value = true
}

function onSyncDone() {
  showWizard.value = false
  scanAll()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* ===== 快速同步横幅 —— 扁平浅色风格 ===== */
.quick-sync-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  background: var(--primary-light);
  border: 1px solid rgba(64,123,247,0.12);
}
.quick-sync-content {
  display: flex;
  align-items: center;
  gap: 14px;
}
.quick-sync-icon-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: #fff;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.quick-sync-text h3 {
  margin: 0 0 3px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.quick-sync-text p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.quick-sync-btn {
  flex-shrink: 0;
  border-radius: var(--radius-sm) !important;
  font-weight: 500 !important;
}

/* ===== 引导卡片 ===== */
.guide-card {
  margin-bottom: 20px;
}
.guide-card :deep(.el-alert) {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

/* ===== 同步状态栏自定义 ===== */
.status-bar-modern:deep(.status-value.path) {
  font-size: 13px;
  font-weight: 500;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* ===== 服务器区块 ===== */
.server-section {
  margin-bottom: 20px;
}
.section-actions {
  display: flex;
  gap: 8px;
}

/* ===== 服务器卡片 —— 扁平白色风格 ===== */
.server-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px 22px;
  margin-bottom: 12px;
  transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
}
.server-card:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-md);
}
.server-card-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.server-card-main {
  display: flex;
  align-items: center;
  gap: 14px;
}
.server-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}
.server-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.server-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.server-path {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.server-diff-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding-left: 54px;
}
.server-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.server-last-sync {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
.server-card-actions {
  display: flex;
  gap: 8px;
}
</style>
