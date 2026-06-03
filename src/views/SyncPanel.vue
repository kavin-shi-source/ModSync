<template>
  <div class="sync-panel">
    <div class="page-header">
      <h3>🔄 同步管理</h3>
      <el-button type="primary" @click="scanDiffs" :loading="scanning">扫描差异</el-button>
      <el-button type="success" @click="syncSelected" :disabled="diffs.length === 0" :loading="syncing">
        同步选中
      </el-button>
      <el-button @click="syncAll" :disabled="diffs.length === 0" :loading="syncing">
        同步全部
      </el-button>
      <el-button v-if="diffs.length > 0" size="small" @click="selectAllCurrent">
        全选
      </el-button>
      <el-button v-if="diffs.length > 0" size="small" @click="clearAllCurrent">
        清空
      </el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane v-for="server in servers" :key="server.id" :label="server.name" :name="server.id">
        <DiffTree
          :ref="el => setTreeRef(server.id, el)"
          :diffs="serverDiffs[server.id] || []"
          :ignored-paths="ignoredPaths[server.id] || []"
          @ignore="onIgnore(server.id, $event)"
          @unignore="onUnignore(server.id, $event)"
          @batch-ignore="onBatchIgnore(server.id, $event)"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { showSuccess, showError, showWarning } from '@/utils/feedback'
import DiffTree from '@/components/DiffTree.vue'

const servers = ref([])
const templatePath = ref('')
const serverDiffs = reactive({})
const ignoredPaths = reactive({})
const scanning = ref(false)
const syncing = ref(false)
const activeTab = ref('')
const treeRefs = reactive({})

const diffs = computed(() => Object.values(serverDiffs).flat())

function setTreeRef(serverId, el) {
  treeRefs[serverId] = el
}

function getCurrentTree() {
  return treeRefs[activeTab.value] || null
}

// ---- 忽略管理 ----
async function loadIgnores(serverId) {
  try {
    const ignores = await window.electronAPI.getIgnores(serverId)
    ignoredPaths[serverId] = (ignores || []).map(i => i.relative_path)
  } catch {
    ignoredPaths[serverId] = []
  }
}

async function onIgnore(serverId, diff) {
  try {
    await window.electronAPI.addIgnore(serverId, diff.relativePath)
    // 重新加载忽略列表（刷新计算属性）
    await loadIgnores(serverId)
    showSuccess(`已忽略: ${diff.relativePath}`)
  } catch (err) {
    showError('忽略失败', err.message)
  }
}

async function onUnignore(serverId, diff) {
  try {
    await window.electronAPI.removeIgnore(serverId, diff.relativePath)
    await loadIgnores(serverId)
    showSuccess(`已取消忽略: ${diff.relativePath}`)
  } catch (err) {
    showError('取消忽略失败', err.message)
  }
}

async function onBatchIgnore(serverId, diffs) {
  if (!diffs || diffs.length === 0) return
  let successCount = 0
  let failCount = 0
  for (const diff of diffs) {
    try {
      await window.electronAPI.addIgnore(serverId, diff.relativePath)
      successCount++
    } catch {
      failCount++
    }
  }
  await loadIgnores(serverId)
  if (failCount === 0) {
    showSuccess(`已批量忽略 ${successCount} 个项目`)
  } else {
    showWarning(`已忽略 ${successCount} 个，${failCount} 个失败`)
  }
}

// ---- 扫描 ----
async function scanDiffs() {
  scanning.value = true
  for (const server of servers.value) {
    try {
      const result = await window.electronAPI.diffDirectories(templatePath.value, server.path, [])
      serverDiffs[server.id] = [
        ...result.added.filter(f => f.type === 'templateOnly').map(f => ({ ...f, type: 'added', label: '新增', actionText: '推送到服务器' })),
        ...result.added.filter(f => f.type === 'serverOnly').map(f => ({ ...f, type: 'serverOnly', label: '服务器独有', actionText: '收集到模板' })),
        ...result.modified.map(f => ({ ...f, type: 'modified', label: '已修改', actionText: '推送到服务器' })),
      ]
      // 顺便加载忽略列表
      if (!ignoredPaths[server.id]) {
        await loadIgnores(server.id)
      }
    } catch (err) {
      serverDiffs[server.id] = []
      showError(`扫描 ${server.name} 失败`, err.message)
    }
  }
  scanning.value = false
}

// ---- 选择操作 ----
function selectAllCurrent() {
  const tree = getCurrentTree()
  if (tree) tree.setCheckAll()
}

function clearAllCurrent() {
  const tree = getCurrentTree()
  if (tree) tree.clearCheck()
}

function onTabChange() {
  // 切换标签时不做特殊处理
}

// ---- 同步 ----
async function syncSelected() {
  const tree = getCurrentTree()
  if (!tree) return
  const checkedDiffs = tree.getCheckedDiffs()
  if (checkedDiffs.length === 0) {
    showWarning('请先勾选需要同步的文件')
    return
  }
  await executeSync(checkedDiffs)
  tree.clearCheck()
  await scanDiffs()
}

async function syncAll() {
  let allDiffs = []
  for (const server of servers.value) {
    allDiffs = allDiffs.concat(serverDiffs[server.id] || [])
  }
  await executeSync(allDiffs)
  await scanDiffs()
}

async function executeSync(diffList) {
  syncing.value = true
  let successCount = 0
  let failCount = 0
  // 按服务器分组执行
  const serverMap = {}
  for (const diff of diffList) {
    const server = servers.value.find(s =>
      (serverDiffs[s.id] || []).some(d => d.relativePath === diff.relativePath)
    )
    if (!server) continue
    if (!serverMap[server.id]) serverMap[server.id] = { server, diffs: [] }
    serverMap[server.id].diffs.push(diff)
  }

  for (const entry of Object.values(serverMap)) {
    const { server, diffs: serverDiffsList } = entry
    for (const diff of serverDiffsList) {
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
  showSuccess(`同步完成: 成功 ${successCount} 个，失败 ${failCount} 个`)
}

onMounted(async () => {
  try {
    const config = await window.electronAPI.getConfig()
    templatePath.value = config.templatePath || ''
    servers.value = (await window.electronAPI.getServers()) || []
    if (servers.value.length > 0) {
      activeTab.value = servers.value[0].id
      // 预加载所有服务器的忽略列表
      for (const s of servers.value) {
        await loadIgnores(s.id)
      }
    }
    if (templatePath.value) await scanDiffs()
  } catch (err) {
    showError('加载同步面板失败', err.message)
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
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.page-header h3 {
  margin: 0;
  flex: 1;
}
</style>
