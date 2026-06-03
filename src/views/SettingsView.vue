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
            <el-input v-model="row.name" size="small" placeholder="输入服务器别名" />
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
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
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

async function selectServerPath(server) {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) server.path = dir
}

function addServer() {
  serverList.value.push({
    id: uuidv4(),
    name: '',
    path: '',
    sort_order: serverList.value.length
  })
}

function removeServer(index) {
  serverList.value.splice(index, 1)
}

async function saveSettings() {
  // 保存模板路径
  await window.electronAPI.saveConfig({ templatePath: templatePath.value })
  // 保存服务器列表
  for (const server of serverList.value) {
    await window.electronAPI.saveServer(server)
  }
  ElMessage.success('设置已保存')
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
