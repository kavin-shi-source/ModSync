<template>
  <div class="settings-page">
    <h3>设置</h3>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="服务器管理" name="servers">
        <el-button type="primary" size="small" @click="openAddDialog" style="margin-bottom: 16px;">
          添加服务器
        </el-button>

        <div v-if="serverList.length === 0" class="empty-hint">
          暂无服务器，点击上方按钮添加
        </div>

        <div v-else class="server-cards">
          <div
            v-for="(server, index) in serverList"
            :key="server.id"
            class="server-card"
          >
            <div class="card-header">
              <el-input
                v-model="server.name"
                size="small"
                placeholder="服务器别名"
                @change="onNameChange(server)"
              />
            </div>
            <div class="card-body">
              <div class="path-info" :title="server.path">
                <el-icon><FolderOpened /></el-icon>
                <span class="path-text">{{ truncatePath(server.path) }}</span>
              </div>
              <div v-if="modStats[server.id]" class="mod-stats">
                <el-tag size="small" type="info">模组 {{ modStats[server.id].total }}</el-tag>
                <el-tag size="small" type="success">启用 {{ modStats[server.id].enabled }}</el-tag>
                <el-tag v-if="modStats[server.id].disabled > 0" size="small" type="danger">
                  禁用 {{ modStats[server.id].disabled }}
                </el-tag>
              </div>
              <div v-else-if="server.path" class="mod-stats loading">
                加载中…
              </div>
            </div>
            <div class="card-footer">
              <el-button size="small" type="primary" plain @click="scanServer(server)">
                扫描
              </el-button>
              <el-button size="small" type="danger" plain :icon="Delete" @click="removeServer(index)">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="公共模板库" name="template">
        <el-card class="settings-card" shadow="never">
          <template #header>
            <span>公共模板路径</span>
          </template>
          <el-form label-width="120px">
            <el-form-item label="模板路径">
              <el-input v-model="templatePath" placeholder="选择公共模板目录" readonly>
                <template #append>
                  <el-button @click="selectTemplatePath">浏览</el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <div class="settings-actions">
      <el-button type="primary" @click="saveSettings">保存设置</el-button>
    </div>

    <!-- 添加服务器对话框 -->
    <el-dialog v-model="addDialogVisible" title="添加服务器" width="500px" :close-on-click-modal="false">
      <el-form label-width="100px">
        <el-form-item label="服务器名称">
          <el-input v-model="addForm.name" placeholder="输入服务器别名" />
        </el-form-item>
        <el-form-item label="服务器目录">
          <el-input v-model="addForm.path" placeholder="选择服务器目录" readonly>
            <template #append>
              <el-button @click="selectAddDirectory">浏览</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="pathValidation.message" label=" ">
          <div :class="['validation-hint', pathValidation.valid ? 'hint-success' : 'hint-error']">
            <el-icon v-if="pathValidation.valid"><CircleCheckFilled /></el-icon>
            <el-icon v-else><WarningFilled /></el-icon>
            <span>{{ pathValidation.message }}</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddServer" :disabled="!canAddServer">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, FolderOpened, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { showSuccess, showError } from '@/utils/feedback'
import { v4 as uuidv4 } from 'uuid'

const router = useRouter()

const activeTab = ref('servers')
const templatePath = ref('')
const serverList = ref([])
const modStats = reactive({})

// 添加服务器对话框
const addDialogVisible = ref(false)
const addForm = reactive({ name: '', path: '' })
const pathValidation = reactive({ valid: false, message: '' })
const addServerDirectorySelected = ref(false)

const canAddServer = computed(() => addForm.name.trim() && addForm.path.trim() && addServerDirectorySelected.value)

function truncatePath(p) {
  if (!p) return ''
  if (p.length <= 50) return p
  return '…' + p.slice(-47)
}

async function loadModStats(server) {
  if (!server.path || !server.id) return
  try {
    const entries = await window.electronAPI.readDirectory(server.path + '/mods')
    const jarFiles = entries.filter(e => e.isFile && /\.jar(\.disabled)?$/i.test(e.name))
    const total = jarFiles.length
    const disabled = jarFiles.filter(e => /\.disabled$/i.test(e.name)).length
    const enabled = total - disabled
    modStats[server.id] = { total, enabled, disabled }
  } catch {
    modStats[server.id] = { total: 0, enabled: 0, disabled: 0 }
  }
}

async function loadAllModStats() {
  for (const server of serverList.value) {
    await loadModStats(server)
  }
}

onMounted(async () => {
  if (window.electronAPI) {
    const config = await window.electronAPI.getConfig()
    if (config.templatePath) templatePath.value = config.templatePath
    serverList.value = await window.electronAPI.getServers() || []
    await loadAllModStats()
  }
})

watch(serverList, () => {
  // 当服务器列表变化时，为新服务器加载统计
  for (const server of serverList.value) {
    if (!modStats[server.id]) {
      loadModStats(server)
    }
  }
}, { deep: true })

async function selectTemplatePath() {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) templatePath.value = dir
}

function onNameChange(row) {
  if (row.id) {
    window.electronAPI.saveServer({ ...row })
  }
}

// ---- 添加服务器对话框 ----
function openAddDialog() {
  addForm.name = ''
  addForm.path = ''
  pathValidation.valid = false
  pathValidation.message = ''
  addServerDirectorySelected.value = false
  addDialogVisible.value = true
}

async function selectAddDirectory() {
  const dir = await window.electronAPI.selectDirectory()
  if (!dir) return

  addForm.path = dir

  // 自动填充服务器名称（取目录名）
  const parts = dir.replace(/\\/g, '/').split('/')
  addForm.name = parts[parts.length - 1] || ''

  // 验证目录下是否有 mods 子目录
  try {
    const exists = await window.electronAPI.fileExists(dir + '/mods')
    if (exists) {
      pathValidation.valid = true
      pathValidation.message = '目录验证通过'
      addServerDirectorySelected.value = true
    } else {
      pathValidation.valid = false
      pathValidation.message = '所选目录下未找到 mods 文件夹'
      addServerDirectorySelected.value = false
    }
  } catch {
    pathValidation.valid = false
    pathValidation.message = '无法访问所选目录'
    addServerDirectorySelected.value = false
  }
}

async function confirmAddServer() {
  const newServer = {
    id: uuidv4(),
    name: addForm.name.trim(),
    path: addForm.path,
    sort_order: serverList.value.length
  }
  serverList.value.push(newServer)
  await window.electronAPI.saveServer(newServer)
  showSuccess('已添加服务器')
  window.dispatchEvent(new CustomEvent('servers-updated'))
  addDialogVisible.value = false
}

async function removeServer(index) {
  const server = serverList.value[index]
  serverList.value.splice(index, 1)
  if (server.id) {
    await window.electronAPI.deleteServer(server.id)
    delete modStats[server.id]
  }
  showSuccess('已删除服务器')
  window.dispatchEvent(new CustomEvent('servers-updated'))
}

function scanServer(server) {
  if (server.id) {
    router.push(`/server/${server.id}`)
  }
}

async function saveSettings() {
  console.log('[saveSettings] 开始保存设置...')
  try {
    console.log('[saveSettings] 保存模板路径:', templatePath.value)
    await window.electronAPI.saveConfig({ templatePath: templatePath.value })
    console.log('[saveSettings] 模板路径保存成功')

    console.log('[saveSettings] 保存服务器列表, 共', serverList.value.length, '个服务器')
    for (const server of serverList.value) {
      if (!server.id) {
        server.id = uuidv4()
      }
      console.log('[saveSettings] 保存服务器:', server.id, server.name, server.path)
      await window.electronAPI.saveServer({ ...server })
    }
    console.log('[saveSettings] 所有服务器保存成功')

    showSuccess('设置已保存')
    console.log('[saveSettings] 触发 servers-updated 事件')
    window.dispatchEvent(new CustomEvent('servers-updated'))
  } catch (err) {
    console.error('[saveSettings] 保存设置失败:', err)
    showError('保存设置失败', err.message || err)
  }
}
</script>

<style scoped>
.settings-page {
  padding: 0;
}
.settings-card {
  margin-bottom: 20px;
}
.settings-actions {
  margin-top: 20px;
}
.empty-hint {
  color: var(--text-muted, #909399);
  font-size: 14px;
  text-align: center;
  padding: 40px 0;
}

/* ---- 服务器卡片 ---- */
.server-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.server-card {
  border: 1px solid var(--border-color, #e4e7ed);
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-card, #fff);
  transition: box-shadow 0.25s, border-color 0.25s;
}
.server-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary, #409eff);
}
.card-header {
  margin-bottom: 10px;
}
.card-body {
  margin-bottom: 12px;
}
.path-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted, #909399);
  margin-bottom: 8px;
}
.path-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mod-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mod-stats.loading {
  font-size: 12px;
  color: var(--text-muted, #909399);
}
.card-footer {
  display: flex;
  gap: 8px;
}

/* ---- 验证提示 ---- */
.validation-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
}
.hint-success {
  color: var(--el-color-success, #67c23a);
}
.hint-error {
  color: var(--el-color-danger, #f56c6c);
}
</style>
