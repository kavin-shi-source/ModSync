<template>
  <el-container class="app-container">
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="app-sidebar">
      <div class="sidebar-header">
        <span v-show="!isCollapsed" class="logo-text">模</span>
        <el-button
          :icon="isCollapsed ? Expand : Fold"
          size="small"
          circle
          class="collapse-btn"
          @click="isCollapsed = !isCollapsed"
        />
      </div>
      <el-menu
        :router="true"
        :default-active="currentRoute"
        :collapse="isCollapsed"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/template">
          <el-icon><FolderOpened /></el-icon>
          <template #title>公共模板</template>
        </el-menu-item>
        <el-sub-menu index="servers">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <span>服务器</span>
          </template>
          <el-menu-item
            v-for="server in servers"
            :key="server.id"
            :index="`/server/${server.id}`"
          >
            {{ server.name }}
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/sync">
          <el-icon><Refresh /></el-icon>
          <template #title>同步管理</template>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>设置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <span class="header-title">模组管理器</span>
        <div class="header-right">
          <ThemeToggle />
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
      <el-footer class="app-footer" height="30px">
        <span>模组统计 · 共 {{ modCount }} 个 · {{ updateCount }} 个待更新 · 同步状态：{{ syncStatus }}</span>
      </el-footer>
    </el-container>
  </el-container>
  <UndoBar />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Expand, Fold } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ThemeToggle from '@/components/ThemeToggle.vue'
import UndoBar from '@/components/UndoBar.vue'
import { FolderOpened, Monitor, Refresh, Setting } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const store = useAppStore()
const servers = ref([])
const isCollapsed = ref(false)

const currentRoute = computed(() => route.path)
const modCount = computed(() => store.modCount)
const updateCount = computed(() => store.updateCount)
const syncStatus = computed(() => store.syncStatus)

async function loadServers() {
  if (window.electronAPI) {
    servers.value = await window.electronAPI.getServers()
  }
}

function handleKeyboard(e) {
  // Ctrl+Shift+S 跳转到同步页面
  if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    router.push('/sync')
  }
}

onMounted(async () => {
  await loadServers()
  // 监听服务器列表变更（设置页面保存后自动刷新侧边栏）
  window.addEventListener('servers-updated', loadServers)
  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('servers-updated', loadServers)
  window.removeEventListener('keydown', handleKeyboard)
})
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}
.app-container {
  height: 100vh;
}
.app-sidebar {
  background-color: var(--bg-sidebar);
  overflow-y: auto;
}
.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  border-bottom: 1px solid var(--border-color);
  padding: 0 8px;
}
.sidebar-header .logo-text {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  flex-shrink: 0;
}
.collapse-btn {
  flex-shrink: 0;
  color: #bfcbd9 !important;
  border: none !important;
  background: transparent !important;
  font-size: 16px;
}
.collapse-btn:hover {
  color: #fff !important;
  background: rgba(255,255,255,0.1) !important;
}
.app-header {
  display: flex;
  align-items: center;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
  padding: 0 20px;
}
.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
}
.app-main {
  background: var(--bg-primary);
  padding: 20px;
  overflow-y: auto;
}
.app-footer {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 0 20px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
