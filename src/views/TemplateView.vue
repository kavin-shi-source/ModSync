<template>
  <div class="template-view">
    <div class="page-header">
      <h3>公共模板</h3>
      <el-tag v-if="templatePath" type="info" size="small">{{ templatePath }}</el-tag>
      <el-button v-else type="warning" size="small" @click="goSettings">请先设置模板路径</el-button>
    </div>
    <el-card v-if="templatePath" shadow="never">
      <FileBrowser :files="files" />
    </el-card>
    <el-empty v-else description="尚未设置公共模板路径" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FileBrowser from '@/components/FileBrowser.vue'

const router = useRouter()
const templatePath = ref('')
const files = ref([])

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
    const { flattenDirectory } = require('../../../electron/sync-engine')
    files.value = await flattenDirectory(templatePath.value)
  } catch {
    // 使用 IPC 替代
    const entries = await window.electronAPI.readDirectory(templatePath.value)
    files.value = entries
      .filter(e => e.isFile)
      .map(e => ({ relativePath: e.name, name: e.name, path: e.path }))
  }
}

function goSettings() {
  router.push('/settings')
}
</script>

<style scoped>
.template-view {
  padding: 0;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.page-header h3 {
  margin: 0;
}
</style>
