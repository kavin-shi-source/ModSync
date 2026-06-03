<template>
  <div class="settings-page">
    <h3>设置</h3>

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

    <el-card class="settings-card" shadow="never">
      <template #header>
        <span>服务器管理</span>
      </template>
      <el-button type="primary" size="small" @click="addServer" style="margin-bottom: 12px;">
        添加服务器
      </el-button>
      <el-table :data="serverList" border stripe style="width: 100%">
        <el-table-column label="别名" min-width="150">
          <template #default="{ row }">
            <el-input v-model="row.name" size="small" placeholder="输入服务器别名" @change="onNameChange(row)" />
          </template>
        </el-table-column>
        <el-table-column label="路径" min-width="300">
          <template #default="{ row }">
            <el-input v-model="row.path" size="small" placeholder="选择服务器目录" readonly>
              <template #append>
                <el-button @click="selectServerPath(row)">浏览</el-button>
              </template>
            </el-input>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ $index }">
            <el-button type="danger" size="small" :icon="Delete" circle @click="removeServer($index)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div class="settings-actions">
      <el-button type="primary" @click="saveSettings">保存设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { showSuccess, showError } from '@/utils/feedback'
import { v4 as uuidv4 } from 'uuid'

const templatePath = ref('')
const serverList = ref([])

onMounted(async () => {
  if (window.electronAPI) {
    const config = await window.electronAPI.getConfig()
    if (config.templatePath) templatePath.value = config.templatePath
    serverList.value = await window.electronAPI.getServers() || []
  }
})

async function selectTemplatePath() {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) templatePath.value = dir
}

function onNameChange(row) {
  // 立即保存别名到数据库（row 是 Vue Proxy，需解构为普通对象）
  if (row.id) {
    window.electronAPI.saveServer({ ...row })
  }
}

async function selectServerPath(server) {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) {
    server.path = dir
    // server 是 Vue Proxy，需解构为普通对象
    await window.electronAPI.saveServer({ ...server })
  }
}

async function addServer() {
  const newServer = {
    id: uuidv4(),
    name: '',
    path: '',
    sort_order: serverList.value.length
  }
  serverList.value.push(newServer)
  // 立即保存到数据库，防止刷新丢失（newServer 是普通对象，无需解构）
  await window.electronAPI.saveServer(newServer)
  showSuccess('已添加服务器')
  // 通知侧边栏刷新
  window.dispatchEvent(new CustomEvent('servers-updated'))
}

async function removeServer(index) {
  const server = serverList.value[index]
  serverList.value.splice(index, 1)
  // 立即从数据库删除
  if (server.id) {
    await window.electronAPI.deleteServer(server.id)
  }
  showSuccess('已删除服务器')
}

async function saveSettings() {
  console.log('[saveSettings] 开始保存设置...')
  try {
    // 保存模板路径
    console.log('[saveSettings] 保存模板路径:', templatePath.value)
    await window.electronAPI.saveConfig({ templatePath: templatePath.value })
    console.log('[saveSettings] 模板路径保存成功')

    // 保存服务器列表（同步最新的 name/path/sort_order）
    console.log('[saveSettings] 保存服务器列表, 共', serverList.value.length, '个服务器')
    for (const server of serverList.value) {
      if (!server.id) {
        server.id = uuidv4()
      }
      console.log('[saveSettings] 保存服务器:', server.id, server.name, server.path)
      // server 是 Vue Proxy，需解构为普通对象再传入 IPC
      await window.electronAPI.saveServer({ ...server })
    }
    console.log('[saveSettings] 所有服务器保存成功')

    showSuccess('设置已保存')
    // 通知其他页面刷新服务器列表
    console.log('[saveSettings] 触发 servers-updated 事件')
    window.dispatchEvent(new CustomEvent('servers-updated'))
  } catch (err) {
    console.error('[saveSettings] 保存设置失败:', err)
    showError('保存设置失败', err.message || err)
    // 作为最后的保障，也用 alert 显示错误
    alert('保存设置失败: ' + (err.message || err))
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
</style>
