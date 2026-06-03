<template>
  <div class="page-content">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title-group">
        <h2>公共模板</h2>
        <p>配置和管理模组公共模板文件</p>
      </div>
      <div class="header-actions">
        <el-tag
          v-if="templatePath"
          type="info"
          effect="plain"
          class="path-tag"
        >
          <el-icon class="tag-icon"><FolderOpened /></el-icon>
          {{ templatePath }}
        </el-tag>
        <el-button
          v-else
          type="warning"
          :icon="Setting"
          @click="goSettings"
        >
          请先设置模板路径
        </el-button>
      </div>
    </div>

    <template v-if="templatePath">
      <!-- 配置继承链 -->
      <div class="inheritance-section">
        <div class="section-header">
          <h3>
            <el-icon class="section-icon"><Connection /></el-icon>
            配置继承链
          </h3>
          <el-tag size="small" type="info" effect="plain">
            优先级从低到高
          </el-tag>
        </div>
        <div class="chain-card">
          <div class="chain-flow">
            <div
              class="chain-node"
              v-for="(item, idx) in inheritanceChain"
              :key="idx"
            >
              <div class="chain-node-dot" :class="'dot-' + item.type"></div>
              <div class="chain-node-label">{{ item.name }}</div>
              <el-tag
                size="small"
                :type="item.type"
                effect="light"
                class="chain-node-tag"
              >
                {{ item.type === 'info' ? '基础层' : item.type === 'primary' ? '模板层' : '特化层' }}
              </el-tag>
              <div v-if="idx < inheritanceChain.length - 1" class="chain-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模组文件列表 -->
      <div class="files-section">
        <div class="section-header">
          <h3>
            <el-icon class="section-icon"><FolderOpened /></el-icon>
            模组文件
          </h3>
          <el-tag
            size="small"
            type="primary"
            effect="plain"
          >
            {{ files.length }} 个文件
          </el-tag>
        </div>
        <div class="files-card">
          <FileBrowser :files="files" />
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon-wrap">
        <el-icon class="empty-icon"><FolderDelete /></el-icon>
      </div>
      <h3 class="empty-title">尚未设置公共模板路径</h3>
      <p class="empty-desc">请先配置模板路径以开始管理模组文件</p>
      <el-button type="primary" :icon="Setting" @click="goSettings">
        前往设置
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  FolderOpened,
  FolderDelete,
  Setting,
  Connection
} from '@element-plus/icons-vue'
import FileBrowser from '@/components/FileBrowser.vue'

const router = useRouter()
const templatePath = ref('')
const files = ref([])

const inheritanceChain = computed(() => {
  const chain = [
    { name: '全局默认配置', type: 'info' },
    { name: '公共模板', type: 'primary' },
    { name: '服务器特化', type: 'success' },
  ]
  return chain
})

onMounted(async () => {
  if (window.electronAPI) {
    const config = await window.electronAPI.getConfig()
    if (config.templatePath) {
      templatePath.value = config.templatePath
      await loadFiles()
    }
  }
})

async function loadFiles() {
  try {
    if (window.electronAPI.flattenDirectory) {
      files.value = await window.electronAPI.flattenDirectory(templatePath.value)
    } else {
      // 兼容：使用 IPC readDirectory 替代
      const entries = await window.electronAPI.readDirectory(templatePath.value)
      files.value = entries
        .filter(e => e.type === 'file')
        .map(e => ({ relativePath: e.name, name: e.name, path: e.path }))
    }
  } catch (err) {
    console.error('加载公共库文件失败:', err)
    files.value = []
  }
}

function goSettings() {
  router.push('/settings')
}
</script>

<style scoped>
.page-content {
  background: var(--bg-primary);
  min-height: 100%;
}

/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  background: var(--bg-card);
  border-radius: 10px;
  padding: 20px 24px;
  border: 1px solid var(--border-color);
  transition: box-shadow 0.2s ease;
}

.page-header:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.page-title-group h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-title-group p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ===== 头部操作区 ===== */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  max-width: 50%;
}

.path-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 5px 14px;
  font-size: 13px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
}

.tag-icon {
  font-size: 14px;
  flex-shrink: 0;
  color: var(--info-color);
}

/* ===== 区域标题 ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.section-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.section-icon {
  font-size: 17px;
  color: var(--primary-color);
  margin-right: 2px;
  vertical-align: middle;
}

/* ===== 继承链区域 ===== */
.inheritance-section {
  margin-bottom: 24px;
}

.chain-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 24px 28px;
  transition: box-shadow 0.2s ease;
}

.chain-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.chain-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
}

.chain-node {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.chain-node-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid var(--border-color);
}

.dot-info {
  background: var(--info-color);
}

.dot-primary {
  background: var(--primary-color);
}

.dot-success {
  background: #67c23a;
}

.chain-node-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.chain-node-tag {
  margin-left: 0;
}

.chain-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 18px;
  color: var(--border-color);
  font-size: 16px;
}

/* ===== 文件列表区域 ===== */
.files-section {
  margin-bottom: 24px;
}

.files-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 20px 24px;
  transition: box-shadow 0.2s ease;
}

.files-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}

.empty-icon-wrap {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
}

.empty-icon {
  font-size: 32px;
  color: var(--info-color);
}

.empty-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-desc {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
