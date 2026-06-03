<template>
  <div class="page-content">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title-group">
        <h2>设置</h2>
        <p>管理服务器和同步配置</p>
      </div>
    </div>

    <!-- 服务器管理 -->
    <div class="section-header">
      <h3>服务器管理</h3>
      <el-button type="primary" size="small" @click="openAddDialog">
        添加服务器
      </el-button>
    </div>

    <div v-if="serverList.length === 0" class="empty-state">
      <p class="empty-text">暂无服务器，点击上方按钮添加</p>
    </div>

    <div v-else class="server-grid">
      <div
        v-for="(server, index) in serverList"
        :key="server.id"
        class="server-card"
      >
        <div class="server-card__header">
          <el-input
            v-model="server.name"
            size="small"
            placeholder="服务器别名"
            @change="onNameChange(server)"
          />
        </div>
        <div class="server-card__body">
          <div class="path-info" :title="server.path">
            <el-icon class="path-icon"><FolderOpened /></el-icon>
            <span class="path-text">{{ truncatePath(server.path) }}</span>
          </div>
          <div v-if="modStats[server.id]" class="mod-tags">
            <el-tag size="small" type="info">模组 {{ modStats[server.id].total }}</el-tag>
            <el-tag size="small" type="success">启用 {{ modStats[server.id].enabled }}</el-tag>
            <el-tag v-if="modStats[server.id].disabled > 0" size="small" type="danger">
              禁用 {{ modStats[server.id].disabled }}
            </el-tag>
          </div>
          <div v-else-if="server.path" class="mod-tags loading">
            加载中…
          </div>
        </div>
        <div class="server-card__footer">
          <el-button size="small" type="primary" plain @click="scanServer(server)">
            扫描
          </el-button>
          <el-button size="small" type="danger" plain :icon="Delete" @click="removeServer(index)">
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 公共模板库 -->
    <div class="section-header" style="margin-top: 32px;">
      <h3>公共模板库</h3>
    </div>

    <div class="settings-panel">
      <div class="settings-panel__body">
        <div class="form-row">
          <label class="form-label">模板路径</label>
          <div class="form-input-wrap">
            <el-input v-model="templatePath" placeholder="选择公共模板目录" readonly>
              <template #append>
                <el-button @click="selectTemplatePath">浏览</el-button>
              </template>
            </el-input>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="save-bar">
      <el-button type="primary" size="large" @click="saveSettings">
        保存设置
      </el-button>
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
/* ===== 服务器卡片网格 ===== */
.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}

.server-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  transition: box-shadow var(--transition-normal);
  box-shadow: none;
}

.server-card:hover {
  box-shadow: var(--shadow-md);
}

.server-card__header {
  margin-bottom: 12px;
}

.server-card__body {
  flex: 1;
  margin-bottom: 14px;
}

.server-card__footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

/* ===== 路径信息 ===== */
.path-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.path-icon {
  flex-shrink: 0;
  font-size: 15px;
}

.path-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 模组标签 ===== */
.mod-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mod-tags.loading {
  font-size: 12px;
  color: var(--text-muted);
}

/* ===== 设置面板 ===== */
.settings-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.settings-panel__body {
  padding: 20px 24px;
}

/* ===== 表单行 ===== */
.form-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 80px;
}

.form-input-wrap {
  flex: 1;
}

/* ===== 保存按钮栏 ===== */
.save-bar {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

.empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
}

/* ===== 验证提示 ===== */
.validation-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.hint-success {
  color: var(--success-color);
}

.hint-error {
  color: var(--danger-color);
}
</style>
