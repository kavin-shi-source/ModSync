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
    <el-card v-if="templatePath" class="inheritance-card" shadow="never">
      <template #header>
        <span>配置继承链</span>
      </template>
      <div class="inheritance-chain">
        <div class="chain-item" v-for="(item, idx) in inheritanceChain" :key="idx">
          <el-tag :type="item.type">{{ item.name }}</el-tag>
          <el-icon v-if="idx < inheritanceChain.length - 1"><ArrowRight /></el-icon>
        </div>
      </div>
    </el-card>
    <el-empty v-else description="尚未设置公共模板路径" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
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
.inheritance-card {
  margin-top: 20px;
}
.inheritance-chain {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.chain-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
