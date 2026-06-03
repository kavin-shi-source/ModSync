<template>
  <div class="file-browser">
    <el-input
      v-model="searchQuery"
      placeholder="搜索文件..."
      size="small"
      clearable
      style="margin-bottom: 12px;"
    />
    <el-tree
      :data="treeData"
      :filter-node-method="filterNode"
      node-key="path"
      highlight-current
      default-expand-all
      ref="treeRef"
    >
      <template #default="{ node, data }">
        <span class="file-item">
          <el-icon v-if="data.isDirectory"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>
          <span class="file-name">{{ data.name }}</span>
          <span class="file-size" v-if="data.size">{{ formatSize(data.size) }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Folder, Document } from '@element-plus/icons-vue'

const props = defineProps({
  files: { type: Array, default: () => [] }
})

const searchQuery = ref('')
const treeRef = ref(null)

const treeData = computed(() => {
  return buildTree(props.files)
})

function buildTree(files) {
  if (!files || files.length === 0) return []
  const root = { name: '/', path: '/', isDirectory: true, children: [] }
  const map = { '/': root }

  for (const file of files) {
    const parts = file.relativePath.split('/')
    let currentPath = ''
    for (let i = 0; i < parts.length; i++) {
      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
      if (!map[currentPath]) {
        const isDir = i < parts.length - 1
        const entry = {
          name: parts[i],
          path: currentPath,
          isDirectory: isDir,
          size: isDir ? undefined : file.size,
          modifiedTime: file.modifiedTime,
          children: isDir ? [] : undefined
        }
        map[currentPath] = entry
        map[parentPath || '/'].children.push(entry)
      }
    }
  }
  return root.children
}

function filterNode(value, data) {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase())
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

watch(searchQuery, (val) => {
  treeRef.value?.filter(val)
})
</script>

<style scoped>
.file-browser {
  height: 100%;
}
.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-size {
  color: #909399;
  font-size: 12px;
  margin-left: 8px;
}
</style>
