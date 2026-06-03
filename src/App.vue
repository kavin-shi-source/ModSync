<template>
  <el-container class="app-container">
    <el-aside width="220px" class="app-sidebar">
      <div class="sidebar-header">
        <span class="logo-text">模</span>
      </div>
      <el-menu
        :router="true"
        :default-active="currentRoute"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/template">
          <el-icon><FolderOpened /></el-icon>
          <span>公共模板</span>
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
          <span>同步管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <span class="header-title">模组管理器</span>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
      <el-footer class="app-footer" height="30px">
        <span>模组统计 · 共 {{ modCount }} 个 · {{ updateCount }} 个待更新 · 同步状态：{{ syncStatus }}</span>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { FolderOpened, Monitor, Refresh, Setting } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const store = useAppStore()
const servers = ref([])

const currentRoute = computed(() => route.path)
const modCount = computed(() => store.modCount)
const updateCount = computed(() => store.updateCount)
const syncStatus = computed(() => store.syncStatus)

async function loadServers() {
  if (window.electronAPI) {
    servers.value = await window.electronAPI.getServers()
  }
}

onMounted(async () => {
  await loadServers()
  // 监听服务器列表变更（设置页面保存后自动刷新侧边栏）
  window.addEventListener('servers-updated', loadServers)
})

onUnmounted(() => {
  window.removeEventListener('servers-updated', loadServers)
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
  color: #fff;
  border-bottom: 1px solid var(--border-color);
}
.sidebar-header .logo-text {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
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
