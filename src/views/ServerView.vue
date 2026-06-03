<template>
  <div class="server-view">
    <div class="page-header">
      <h3>{{ currentServer?.name || '服务器' }}</h3>
      <span class="path-hint">{{ currentServer?.path }}</span>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ modTotal }}</div>
          <div class="stat-label">模组总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value stat-enabled">{{ modEnabled }}</div>
          <div class="stat-label">已启用</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value stat-disabled">{{ modDisabled }}</div>
          <div class="stat-label">已禁用</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value stat-update">{{ modUpdatable }}</div>
          <div class="stat-label">可更新</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作入口 -->
    <el-row :gutter="16" class="quick-actions">
      <el-col :span="8" v-for="action in quickActions" :key="action.label">
        <el-card shadow="hover" class="action-card" @click="action.handler">
          <el-icon :size="24"><component :is="action.icon" /></el-icon>
          <div class="action-label">{{ action.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 状态提示 -->
    <div class="status-bar">
      <span class="sync-status" :class="syncStatusClass">
        <span class="status-dot"></span>
        {{ syncStatusText }}
      </span>
      <span v-if="lastSync" class="last-sync">上次同步：{{ lastSync }}</span>
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
const modUpdatable = ref(0)
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

onMounted(async () => {
  store.setCurrentServer(serverId.value)
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
  } catch (err) {
    console.error('[ServerView] 加载模组统计失败:', err)
  }
}
</script>

<style scoped>
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.path-hint { color: #909399; font-size: 12px; }

.stat-cards { margin-bottom: 24px; }
.stat-card { text-align: center; cursor: default; }
.stat-value { font-size: 32px; font-weight: 700; color: #303133; }
.stat-label { font-size: 14px; color: #909399; margin-top: 4px; }
.stat-enabled { color: #67c23a; }
.stat-disabled { color: #f56c6c; }
.stat-update { color: #409eff; }

.quick-actions { margin-bottom: 24px; }
.action-card { text-align: center; cursor: pointer; }
.action-card:hover { transform: translateY(-2px); transition: transform 0.2s; }
.action-label { margin-top: 8px; font-size: 14px; color: #606266; }

.status-bar { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: #f5f7fa; border-radius: 8px; font-size: 13px; }
.sync-status { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.sync-status.idle .status-dot { background: #67c23a; }
.sync-status.syncing .status-dot { background: #409eff; animation: pulse 1.5s infinite; }
.sync-status.failed .status-dot { background: #f56c6c; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.last-sync { color: #909399; }
</style>
