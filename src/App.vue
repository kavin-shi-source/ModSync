<template>
  <div class="app-container">
    <!-- 侧边栏 - 浅色风格 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="logo-icon-svg">
            <path d="M3 3h18v18H3V3zm5 11h8v2H8v-2zm0-4h8v2H8v-2zm0 8h8v2H8v-2zM5 5h2v2H5V5zm0 4h2v2H5V9zm0 4h2v2H5v-2zm0 4h2v2H5v-2zm12-12h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" opacity=".5"/>
          </svg>
          <span v-show="!sidebarCollapsed" class="logo-text">ModSync</span>
        </div>
        <div class="sidebar-collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg v-if="!sidebarCollapsed" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
        </div>
      </div>

      <el-menu
        :default-active="route.path"
        :collapse="sidebarCollapsed"
        :router="true"
        :collapse-transition="false"
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon size="17"><DataBoard /></el-icon>
          <template #title>概览</template>
        </el-menu-item>

        <el-menu-item index="/template">
          <el-icon size="17"><FolderOpened /></el-icon>
          <template #title>公共模板</template>
        </el-menu-item>

        <el-sub-menu index="servers">
          <template #title>
            <el-icon size="17"><Monitor /></el-icon>
            <span>服务器</span>
          </template>
          <el-menu-item
            v-for="server in store.servers"
            :key="server.id"
            :index="`/server/${server.id}`"
          >
            <span>{{ server.name }}</span>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/sync">
          <el-icon size="17"><Refresh /></el-icon>
          <template #title>
            <span class="menu-title-with-badge">
              <span>同步管理</span>
              <el-badge :value="store.totalDiffCount" :hidden="store.totalDiffCount === 0" class="menu-badge" />
            </span>
          </template>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon size="17"><Setting /></el-icon>
          <template #title>设置</template>
        </el-menu-item>
      </el-menu>

      <div v-show="!sidebarCollapsed" class="sidebar-footer">
        <div class="sidebar-status">
          <span class="status-dot" :class="{ active: store.syncStatus !== '空闲' }"></span>
          <span>{{ store.syncStatus }}</span>
        </div>
        <div class="sidebar-mod-count">{{ store.modCount }} 个模组</div>
        <div class="theme-toggle-row">
          <ThemeToggle />
          <span class="theme-label">{{ themeStore.isDark ? '深色' : '浅色' }}</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component, route: childRoute }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" :key="childRoute.path" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { FolderOpened, Monitor, Refresh, Setting, DataBoard } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useThemeStore } from '@/stores/theme'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const store = useAppStore()
const themeStore = useThemeStore()
const sidebarCollapsed = ref(false)
</script>

<style>
html, body, #app {
  margin: 0; padding: 0;
  height: 100%; overflow: hidden;
  background: #f5f6fa;
}
</style>

<style scoped>
.app-container {
  display: flex; height: 100vh; overflow: hidden;
}

/* ===== 浅色侧边栏 ===== */
.sidebar {
  width: 200px; min-width: 200px;
  display: flex; flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  transition: all 0.25s ease;
  z-index: 100; overflow: hidden; user-select: none;
}
.sidebar.collapsed { width: 56px; min-width: 56px; }

/* 头部 */
.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 12px 10px;
}
.sidebar-logo {
  display: flex; align-items: center; gap: 8px; overflow: hidden;
}
.logo-icon-svg {
  color: var(--text-primary); flex-shrink: 0;
}
.logo-text {
  font-size: 15px; font-weight: 700; white-space: nowrap;
  color: var(--text-primary); letter-spacing: 0.3px;
}
.sidebar-collapse-btn {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; cursor: pointer;
  color: var(--text-muted); flex-shrink: 0;
  transition: all 0.15s;
}
.sidebar-collapse-btn:hover {
  background: var(--bg-sidebar-hover); color: var(--text-secondary);
}

/* 菜单 */
.sidebar-menu {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  background: transparent !important; padding: 4px 0;
}
.sidebar-menu .el-menu-item,
.sidebar-menu .el-sub-menu__title {
  color: var(--text-secondary) !important;
  background: transparent !important;
  border-radius: 5px; margin: 1px 7px;
  width: auto; height: 36px; line-height: 36px;
  font-size: 13px;
}
.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-sub-menu__title:hover {
  color: var(--text-primary) !important;
  background: var(--bg-sidebar-hover) !important;
}
.sidebar-menu .el-menu-item.is-active {
  color: var(--primary-color) !important;
  background: var(--bg-sidebar-active) !important;
  font-weight: 600;
}
.sidebar-menu .el-menu-item .el-icon,
.sidebar-menu .el-sub-menu__title .el-icon {
  color: inherit !important; font-size: 17px;
}
.sidebar-menu .el-sub-menu .el-menu { background: transparent !important; }
.sidebar-menu .el-sub-menu .el-menu-item { padding-left: 42px !important; font-size: 12px; }

.menu-title-with-badge { display: flex; align-items: center; gap: 6px; }
.menu-badge :deep(.el-badge__content) {
  position: static; transform: none;
  background: var(--danger-color); border: none;
  font-size: 10px; height: 15px; line-height: 15px; padding: 0 4px;
}

/* 底部 */
.sidebar-footer {
  padding: 10px 12px 12px;
  font-size: 11px; color: var(--text-muted);
  border-top: 1px solid var(--border-light);
}
.sidebar-status,
.sidebar-mod-count {
  display: flex; align-items: center; gap: 5px; margin: 2px 0;
}
.theme-toggle-row {
  display: flex; align-items: center; gap: 6px;
  margin-top: 8px; padding-top: 8px;
  border-top: 1px solid var(--border-light);
}
.theme-label {
  font-size: 11px; color: var(--text-muted);
}
.status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--success-color); flex-shrink: 0;
}
.status-dot.active {
  background: var(--warning-color);
  animation: pulse-dot 1.5s infinite;
}
@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }

/* 主内容区 */
.main-content {
  flex: 1; overflow: hidden;
  display: flex; flex-direction: column;
  background: var(--bg-primary);
}
</style>
