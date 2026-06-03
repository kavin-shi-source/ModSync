<template>
  <div class="sync-panel">
    <div class="page-header">
      <h3>🔄 同步管理</h3>
      <el-button type="primary" @click="scanDiffs" :loading="scanning">扫描差异</el-button>
      <el-button type="success" @click="syncAll" :disabled="diffs.length === 0" :loading="syncing">
        同步全部
      </el-button>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane v-for="server in servers" :key="server.id" :label="server.name" :name="server.id">
        <SyncDiff
          :diffs="serverDiffs[server.id] || []"
          @action="handleAction(server, $event)"
          @showConflict="showConflict"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SyncDiff from '@/components/SyncDiff.vue'

const servers = ref([])
const templatePath = ref('')
const serverDiffs = reactive({})
const scanning = ref(false)
const syncing = ref(false)
const activeTab = ref('')

async function scanDiffs() {
  scanning.value = true
  for (const server of servers.value) {
    try {
      const result = await window.electronAPI.diffDirectories(templatePath.value, server.path, {
        overriddenFiles: [],
        serverOnlyFiles: [],
      })
      serverDiffs[server.id] = [
        ...result.added.map(f => ({ ...f, type: 'added', label: '新增', actionText: '推送到服务器' })),
        ...result.modified.map(f => ({ ...f, type: 'modified', label: '已修改', actionText: '推送到服务器' })),
        ...result.serverOnly.map(f => ({ ...f, type: 'serverOnly', label: '服务器独有', actionText: '收集到模板' })),
      ]
    } catch (err) {
      serverDiffs[server.id] = []
      ElMessage.error(`扫描 ${server.name} 失败: ${err.message}`)
    }
  }
  scanning.value = false
}

async function handleAction(server, diff) {
  if (diff.type === 'serverOnly') {
    const result = await window.electronAPI.syncCollectToTemplate(server.path, templatePath.value, diff.relativePath)
    if (result.success) ElMessage.success(`已收集 ${diff.relativePath}`)
    else ElMessage.error(`收集失败: ${result.error}`)
  } else {
    const dest = `${server.path}/${diff.relativePath}`
    const result = await window.electronAPI.syncFile(diff.templateFile.fullPath, dest)
    if (result.success) ElMessage.success(`已同步 ${diff.relativePath}`)
    else ElMessage.error(`同步失败: ${result.error}`)
  }
}

async function syncAll() {
  syncing.value = true
  let successCount = 0
  let failCount = 0
  for (const server of servers.value) {
    const diffs = serverDiffs[server.id] || []
    for (const diff of diffs) {
      try {
        if (diff.type === 'serverOnly') {
          const result = await window.electronAPI.syncCollectToTemplate(server.path, templatePath.value, diff.relativePath)
          if (result.success) successCount++
          else failCount++
        } else {
          const dest = `${server.path}/${diff.relativePath}`
          const result = await window.electronAPI.syncFile(diff.templateFile.fullPath, dest)
          if (result.success) successCount++
          else failCount++
        }
      } catch {
        failCount++
      }
    }
  }
  syncing.value = false
  ElMessage.success(`同步完成: 成功 ${successCount} 个，失败 ${failCount} 个`)
  await scanDiffs()
}

async function showConflict(diff) {
  if (diff.type === 'modified') {
    try {
      await ElMessageBox.confirm(
        `文件 "${diff.relativePath}" 在模板和服务器端均有修改。\n\n` +
        `模板文件哈希: ${diff.templateHash || 'N/A'}\n` +
        `服务器文件哈希: ${diff.serverHash || 'N/A'}\n\n` +
        `选择"覆盖"将用模板版本覆盖服务器版本；选择"保留"将不做任何更改。`,
        '文件冲突',
        {
          confirmButtonText: '覆盖',
          cancelButtonText: '保留',
          type: 'warning',
        }
      )
      const server = servers.value.find(s => s.id === activeTab.value)
      if (server) await handleAction(server, { ...diff, type: 'modified' })
    } catch {
      // 用户选择保留
    }
  } else {
    ElMessage.info('该文件无冲突')
  }
}

onMounted(async () => {
  try {
    const config = await window.electronAPI.getConfig()
    templatePath.value = config.templatePath || ''
    servers.value = (await window.electronAPI.getServers()) || []
    if (servers.value.length > 0) activeTab.value = servers.value[0].id
    if (templatePath.value) await scanDiffs()
  } catch (err) {
    ElMessage.error('加载同步面板失败: ' + err.message)
  }
})
</script>

<style scoped>
.sync-panel {
  padding: 20px;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.page-header h3 {
  margin: 0;
  flex: 1;
}
</style>
