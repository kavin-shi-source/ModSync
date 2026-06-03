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
        <span class="custom-tree-node">
          <el-icon>
            <FolderOpened v-if="data.isDirectory" />
            <component :is="getFileIcon(data.name)" v-else />
          </el-icon>
          <span class="node-label">{{ data.name }}</span>
          <span class="file-meta">
            <span class="file-size" v-if="data.size">{{ formatSize(data.size) }}</span>
            <span class="file-modified" v-if="data.modifiedTime">{{ formatTime(data.modifiedTime) }}</span>
          </span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { FolderOpened, Document, PictureFilled, Tickets, Wallet, Cpu } from '@element-plus/icons-vue'

function getFileIcon(name) {
  if (!name) return Document
  const ext = name.split('.').pop()?.toLowerCase()
  const iconMap = {
    // 图片
    png: PictureFilled, jpg: PictureFilled, jpeg: PictureFilled,
    gif: PictureFilled, svg: PictureFilled, webp: PictureFilled, ico: PictureFilled,
    // 压缩/存档
    zip: Wallet, '7z': Wallet, rar: Wallet, tar: Wallet, gz: Wallet, jar: Wallet,
    // 脚本
    sh: Cpu, bat: Cpu, cmd: Cpu,
    // 文本
    txt: Tickets, md: Tickets,
  }
  return iconMap[ext] || Document
}

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

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(searchQuery, (val) => {
  treeRef.value?.filter(val)
})
</script>

<style scoped>
.file-browser {
  height: 100%;
}
.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
}
.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
  flex-shrink: 0;
}
.file-size {
  color: #909399;
  font-size: 12px;
}
.file-modified {
  color: #909399;
  font-size: 12px;
}
</style>
