<template>
  <div class="page-content">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title-group">
        <h2>{{ currentServer?.name || '服务器详情' }}</h2>
        <p>{{ currentServer?.path || '服务器模组状态与同步管理' }}</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="router.push(`/server/${serverId.value}/mods`)">
          <el-icon><Management /></el-icon>
          管理模组
        </el-button>
        <el-button type="success" @click="router.push(`/sync`)">
          <el-icon><Promotion /></el-icon>
          同步更新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card-modern">
        <div class="stat-icon-wrap stat-icon-blue">
          <el-icon :size="22"><Management /></el-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">模组总数</span>
          <span class="stat-number">{{ modTotal }}</span>
        </div>
      </div>
      <div class="stat-card-modern">
        <div class="stat-icon-wrap stat-icon-green">
          <svg class="icon-svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="stat-body">
          <span class="stat-label">已启用</span>
          <span class="stat-number">{{ modEnabled }}</span>
        </div>
      </div>
      <div class="stat-card-modern">
        <div class="stat-icon-wrap stat-icon-orange">
          <svg class="icon-svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <div class="stat-body">
          <span class="stat-label">已禁用</span>
          <span class="stat-number">{{ modDisabled }}</span>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="section-header">
      <h3>快捷操作</h3>
    </div>
    <div class="quick-actions-row">
      <button
        v-for="(action, idx) in quickActions"
        :key="action.label"
        class="quick-action-btn"
        :class="'qa-' + ['primary','success','neutral'][idx]"
        @click="action.handler"
      >
        <el-icon :size="16"><component :is="action.icon" /></el-icon>
        <span>{{ action.label }}</span>
      </button>
    </div>

    <!-- 同步状态 -->
    <div class="section-header sync-section-header">
      <h3>同步状态</h3>
      <span v-if="lastSync" class="sync-time-inline">{{ lastSync }}</span>
      <span v-else class="sync-time-inline muted">从未同步</span>
    </div>
    <div class="server-panel">
      <div class="panel-row">
        <div class="status-indicator">
          <span class="status-dot" :class="syncStatusClass"></span>
          <span class="status-text">{{ syncStatusText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Management, Promotion, FolderOpened } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const serverId = computed(() => route.params.id)
const currentServer = computed(() => store.servers.find(s => s.id === serverId.value))

const modTotal = ref(0)
const modEnabled = ref(0)
const modDisabled = ref(0)
const lastSync = ref('')

const quickActions = [
  { label: '管理模组', icon: Management, handler: () => router.push(`/server/${serverId.value}/mods`) },
  { label: '同步更新', icon: Promotion, handler: () => router.push(`/sync`) },
  { label: '打开文件夹', icon: FolderOpened, handler: openServerFolder }
]

const syncStatusClass = computed(() => {
  switch (store.syncStatus) {
    case '同步中': return 'syncing'
    case '失败': return 'failed'
    default: return 'idle'
  }
})

const syncStatusText = computed(() => {
  return store.syncStatus || '空闲'
})

async function openServerFolder() {
  if (window.electronAPI && currentServer.value?.path) {
    await window.electronAPI.openFolder(currentServer.value.path)
  }
}

function getLastSyncTime() {
  const saved = localStorage.getItem(`last-sync-${serverId.value}`)
  if (saved) {
    lastSync.value = saved
  }
}

onMounted(async () => {
  store.setCurrentServer(serverId.value)
  getLastSyncTime()
  await loadModStats()
})

async function loadModStats() {
  if (!window.electronAPI) return
  try {
    const servers = await window.electronAPI.getServers()
    const srv = servers.find(s => s.id === serverId.value)
    if (!srv || !srv.path) return
    // 更新 store.server 以便 currentServer 能显示路径
    store.$patch({
      servers: servers.map(s => ({ ...s })),
      currentServerId: serverId.value,
    })

    const files = await window.electronAPI.readDirectory(`${srv.path}/mods`)
    let enabled = 0
    let disabled = 0
    for (const file of files) {
      if (file.type === 'file' && (file.name.endsWith('.jar') || file.name.endsWith('.jar.disabled'))) {
        if (file.name.endsWith('.jar.disabled')) {
          disabled++
        } else {
          enabled++
        }
      }
    }
    modTotal.value = enabled + disabled
    modEnabled.value = enabled
    modDisabled.value = disabled
    store.modCount = modTotal.value
    getLastSyncTime()
  } catch (err) {
    console.error('[ServerView] 加载模组统计失败:', err)
  }
}
</script>

<style scoped>
/* ===== 头部操作区 ===== */
.header-actions {
  display: flex;
  gap: 8px;
}

/* ===== 快捷操作行 ===== */
.quick-actions-row {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.quick-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.quick-action-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
  background: var(--bg-primary);
}

.quick-action-btn.qa-primary:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background: var(--primary-light);
}
.quick-action-btn.qa-success:hover {
  color: var(--success-color);
  border-color: var(--success-color);
  background: var(--success-light);
}
.quick-action-btn.qa-neutral:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
  background: var(--bg-primary);
}

/* ===== 同步状态区域 ===== */
.sync-section-header {
  align-items: center;
}

.sync-time-inline {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}
.sync-time-inline.muted {
  color: var(--text-muted);
}

/* ===== 服务器面板（扁平风格） ===== */
.server-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px 22px;
}

.panel-row {
  display: flex;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.idle {
  background: var(--success-color);
}
.status-dot.syncing {
  background: var(--primary-color);
}
.status-dot.failed {
  background: var(--danger-color);
}

.status-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* ===== 图标辅助 ===== */
.icon-svg {
  flex-shrink: 0;
}
</style>
