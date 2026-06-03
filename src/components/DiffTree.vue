<template>
  <div class="diff-tree-modern">
    <!-- 有差异时的主树 -->
    <div v-if="activeDiffs.length > 0">
      <!-- 筛选工具栏 -->
      <div v-if="!compactMode" class="filter-bar-modern">
        <div class="filter-group">
          <el-select v-model="filterType" size="small" placeholder="差异类型" clearable class="filter-select" @change="applyFilters">
            <el-option label="全部" value="" />
            <el-option label="新增" value="added" />
            <el-option label="修改" value="modified" />
            <el-option label="服务器独有" value="serverOnly" />
          </el-select>
          <el-input v-model="searchText" size="small" placeholder="搜索文件名..." clearable class="filter-search" @input="applyFilters">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="filter-actions">
          <el-button size="small" text @click="expandAll">展开全部</el-button>
          <el-button size="small" text @click="collapseAll">折叠全部</el-button>
        </div>
      </div>

      <!-- 统计条 -->
      <div v-if="!compactMode && activeDiffs.length > 0" class="stats-bar-modern">
        <div class="stats-left">
          <span class="stat-total">共 <b>{{ activeDiffs.length }}</b> 项差异</span>
          <template v-if="filterType || searchText">
            <span class="stat-filtered">（筛选后 {{ filteredDiffs.length }} 项）</span>
          </template>
        </div>
        <div class="stats-right">
          <span class="stat-badge stat-added-badge"><span class="dot dot-added"></span>{{ stats.added }} 新增</span>
          <span class="stat-badge stat-modified-badge"><span class="dot dot-modified"></span>{{ stats.modified }} 修改</span>
          <span class="stat-badge stat-server-badge"><span class="dot dot-server"></span>{{ stats.serverOnly }} 独有</span>
        </div>
      </div>

      <!-- 批量操作栏 -->
      <div v-if="!compactMode && checkedCount > 0" class="batch-bar-modern">
        <el-icon class="batch-icon"><InfoFilled /></el-icon>
        <span class="checked-hint">已选中 <b>{{ checkedCount }}</b> 项</span>
        <div class="batch-actions">
          <el-button size="small" @click="clearCheck">取消选择</el-button>
          <el-button size="small" type="warning" @click="onBatchIgnore">批量忽略</el-button>
        </div>
      </div>

      <!-- 差异树 -->
      <div :class="{ 'diff-tree-scroll': compactMode }">
        <el-tree
          ref="treeRef"
          :key="treeKey"
          :data="activeTreeData"
          :props="treeProps"
          node-key="id"
          show-checkbox
          :default-expand-all="false"
          @check="onCheck"
          @check-change="onCheckChange"
          class="diff-el-tree"
        >
          <template #default="{ node, data }">
            <span class="tree-node-modern">
              <span class="node-icon">{{ data._isDir ? '📁' : '📄' }}</span>
              <span class="node-label">{{ data.label }}</span>
              <el-tag
                v-if="data._diffItem"
                :type="diffTagType(data._diffItem.type)"
                size="small"
                class="node-tag"
              >
                {{ data._diffItem.label }}
              </el-tag>
              <span class="node-actions">
                <el-button
                  v-if="!data._isDir && data._diffItem && data._diffItem.type === 'modified'"
                  text
                  size="small"
                  type="primary"
                  class="action-btn"
                  @click.stop="openPreview(data._diffItem)"
                >
                  预览
                </el-button>
                <el-button
                  v-if="!data._isDir"
                  text
                  size="small"
                  class="action-btn ignore-btn"
                  @click.stop="onIgnore(data._diffItem)"
                >
                  忽略
                </el-button>
              </span>
            </span>
          </template>
        </el-tree>
      </div>
    </div>

    <!-- 无差异（但有已忽略项时显示不同文案） -->
    <div v-if="activeDiffs.length === 0 && ignoredList.length === 0" class="empty-state-modern">
      <div class="empty-icon-wrap">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="empty-title">所有服务器与模板保持一致</p>
      <p class="empty-desc">没有发现差异，同步状态良好</p>
    </div>
    <div v-else-if="activeDiffs.length === 0 && ignoredList.length > 0" class="empty-state-modern">
      <div class="empty-icon-wrap ignored-icon-wrap">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <p class="empty-title">所有差异已被忽略</p>
      <p class="empty-desc">下方可查看并取消忽略的项目</p>
    </div>

    <!-- 已忽略项目区域 - 始终在有忽略项时显示 -->
    <div v-if="!compactMode && ignoredList.length > 0" class="ignored-section-modern">
      <el-collapse v-model="ignoredCollapseActive">
        <el-collapse-item name="ignored">
          <template #title>
            <div class="ignored-header">
              <el-icon><Hide /></el-icon>
              <span>已忽略项目</span>
              <el-tag size="small" type="info" round>{{ ignoredList.length }}</el-tag>
            </div>
          </template>
          <el-tree
            ref="ignoredTreeRef"
            :data="ignoredTreeData"
            :props="treeProps"
            node-key="id"
            default-expand-all
            class="ignored-tree-modern"
          >
            <template #default="{ data }">
              <span class="tree-node-modern">
                <span class="node-icon">{{ data._isDir ? '📁' : '📄' }}</span>
                <span class="node-label">{{ data.label }}</span>
                <el-tag
                  v-if="data._diffItem"
                  :type="diffTagType(data._diffItem.type)"
                  size="small"
                  class="node-tag"
                >
                  {{ data._diffItem.label }}
                </el-tag>
                <el-button
                  v-if="!data._isDir"
                  text
                  size="small"
                  type="primary"
                  class="action-btn"
                  @click.stop="onUnignore(data._diffItem)"
                >
                  取消忽略
                </el-button>
              </span>
            </template>
          </el-tree>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 文件差异预览抽屉 -->
    <el-drawer
      v-model="previewVisible"
      title="文件差异预览"
      size="60%"
      direction="rtl"
      :before-close="closePreview"
      class="diff-preview-drawer"
    >
      <div v-if="previewLoading" class="preview-loading">加载中...</div>
      <div v-else-if="previewError" class="preview-error">{{ previewError }}</div>
      <div v-else class="preview-panels-modern">
        <div class="preview-panel-modern">
          <div class="preview-panel-header">
            <span class="panel-label">模板版本</span>
            <span class="panel-badge template-badge">Template</span>
          </div>
          <pre class="preview-content"><code v-html="templateHtml"></code></pre>
        </div>
        <div class="preview-panel-modern">
          <div class="preview-panel-header">
            <span class="panel-label">服务器版本</span>
            <span class="panel-badge server-badge">Server</span>
          </div>
          <pre class="preview-content"><code v-html="serverHtml"></code></pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, InfoFilled, Hide } from '@element-plus/icons-vue'
import { confirmBatch } from '@/utils/confirm'
import { showWarning } from '@/utils/feedback'

const props = defineProps({
  diffs: { type: Array, default: () => [] },
  ignoredPaths: { type: Array, default: () => [] },
  compactMode: { type: Boolean, default: false },
})

const emit = defineEmits(['ignore', 'unignore', 'batchIgnore', 'check'])

const treeRef = ref(null)
const ignoredTreeRef = ref(null)
const treeProps = { children: 'children', label: 'label' }

const filterType = ref('')
const searchText = ref('')
const treeKey = ref(0)
const ignoredCollapseActive = ref(['ignored'])

const previewVisible = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const templateHtml = ref('')
const serverHtml = ref('')
const previewItem = ref(null)

const ignoredSet = computed(() => new Set(props.ignoredPaths))

const activeDiffs = computed(() =>
  props.diffs.filter(d => !ignoredSet.value.has(d.relativePath))
)

const ignoredList = computed(() =>
  props.diffs.filter(d => ignoredSet.value.has(d.relativePath))
)

const ignoredTreeData = computed(() => buildTree(ignoredList.value))

function diffTagType(type) {
  return { added: 'success', modified: 'warning', deleted: 'danger', conflicted: 'danger', serverOnly: 'info' }[type] || 'info'
}

function buildTree(diffs) {
  const rootChildren = []
  const map = {}

  for (const diff of diffs) {
    const parts = diff.relativePath.split('/')
    let currentPath = ''
    let parent = rootChildren

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isLast = i === parts.length - 1

      if (!map[currentPath]) {
        if (isLast) {
          const node = {
            id: currentPath,
            label: part,
            children: undefined,
            _isDir: false,
            _diffItem: diff,
          }
          map[currentPath] = node
          parent.push(node)
        } else {
          const node = {
            id: currentPath,
            label: part,
            children: [],
            _isDir: true,
            _diffItem: null,
          }
          map[currentPath] = node
          parent.push(node)
        }
      }
      if (!isLast) {
        parent = map[currentPath].children
      }
    }
  }

  return rootChildren
}

const activeTreeData = computed(() => buildTree(filteredDiffs.value))

const stats = computed(() => {
  const counts = { added: 0, modified: 0, serverOnly: 0 }
  for (const d of filteredDiffs.value) {
    if (counts[d.type] !== undefined) counts[d.type]++
  }
  return counts
})

const filteredDiffs = computed(() => {
  let list = activeDiffs.value
  if (filterType.value) {
    list = list.filter(d => d.type === filterType.value)
  }
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter(d => d.relativePath.toLowerCase().includes(kw))
  }
  return list
})

function onIgnore(diff) {
  emit('ignore', diff)
}

function onUnignore(diff) {
  emit('unignore', diff)
}

function applyFilters() {
  treeKey.value++
}

function expandAll() {
  if (!treeRef.value) return
  const tree = treeRef.value
  const nodes = tree.store._getAllNodes()
  nodes.forEach(node => { node.expanded = true })
}

function collapseAll() {
  if (!treeRef.value) return
  const tree = treeRef.value
  const nodes = tree.store._getAllNodes()
  nodes.forEach(node => { node.expanded = false })
}

const checkedCount = ref(0)

function onCheck(data, { checkedKeys }) {
  if (data._isDir && data.children && data.children.length > 0) {
    const isChecked = checkedKeys.includes(data.id)
    data.children.forEach(child => {
      treeRef.value?.setChecked(child.id, isChecked)
    })
  }
}

function onCheckChange() {
  if (!treeRef.value) { checkedCount.value = 0; return }
  checkedCount.value = treeRef.value.getCheckedNodes(false, true).filter(n => !n._isDir).length
}

async function onBatchIgnore() {
  const diffs = getCheckedDiffs()
  if (diffs.length === 0) {
    showWarning('请先选择要忽略的项目')
    return
  }
  const confirmed = await confirmBatch('确认批量忽略', diffs.length)
  if (!confirmed) return
  emit('batchIgnore', diffs)
  clearCheck()
}

function getCheckedDiffs() {
  if (!treeRef.value) return []
  const checkedNodes = treeRef.value.getCheckedNodes(false, true)
  return checkedNodes.filter(n => !n._isDir).map(n => n._diffItem)
}

function clearCheck() {
  if (treeRef.value) {
    treeRef.value.setCheckedKeys([])
  }
  checkedCount.value = 0
}

function setCheckAll() {
  if (treeRef.value) {
    const allIds = collectAllLeafIds(activeTreeData.value)
    treeRef.value.setCheckedKeys(allIds)
  }
}

function collectAllLeafIds(nodes) {
  const ids = []
  for (const node of nodes) {
    if (node._isDir && node.children) {
      ids.push(...collectAllLeafIds(node.children))
    } else if (!node._isDir) {
      ids.push(node.id)
    }
  }
  return ids
}

function computeLineDiff(templateLines, serverLines) {
  const maxLen = Math.max(templateLines.length, serverLines.length)
  const tResult = []
  const sResult = []
  for (let i = 0; i < maxLen; i++) {
    const tLine = i < templateLines.length ? templateLines[i] : ''
    const sLine = i < serverLines.length ? serverLines[i] : ''
    if (tLine === sLine) {
      tResult.push(`<span class="hl-common">${escapeHtml(tLine)}</span>`)
      sResult.push(`<span class="hl-common">${escapeHtml(sLine)}</span>`)
    } else {
      tResult.push(`<span class="hl-removed">${escapeHtml(tLine || '')}</span>`)
      sResult.push(`<span class="hl-added">${escapeHtml(sLine || '')}</span>`)
    }
  }
  return { templateHtml: tResult.join('\n'), serverHtml: sResult.join('\n') }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

async function openPreview(diff) {
  previewItem.value = diff
  previewVisible.value = true
  previewLoading.value = true
  previewError.value = ''
  try {
    const [templateContent, serverContent] = await Promise.all([
      window.electronAPI.readFile(diff.templateFile.fullPath),
      window.electronAPI.readFile(diff.serverFile.fullPath),
    ])
    const tLines = (templateContent || '').split('\n')
    const sLines = (serverContent || '').split('\n')
    const result = computeLineDiff(tLines, sLines)
    templateHtml.value = result.templateHtml
    serverHtml.value = result.serverHtml
    previewLoading.value = false
  } catch (err) {
    previewLoading.value = false
    previewError.value = err.message || '无法读取文件'
  }
}

function closePreview() {
  previewVisible.value = false
  templateHtml.value = ''
  serverHtml.value = ''
  previewError.value = ''
  previewItem.value = null
}

defineExpose({ getCheckedDiffs, clearCheck, setCheckAll })
</script>

<style scoped>
/* ===== Snowwolf Design System ===== */
.diff-tree-modern {
  min-height: 60px;
}

/* ===== 空状态 ===== */
.empty-state-modern {
  text-align: center;
  padding: 48px 20px;
}
.empty-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--success-color);
  margin-bottom: 16px;
}
.ignored-icon-wrap {
  background: var(--warning-light);
  color: var(--warning-color);
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px;
}
.empty-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

/* ===== 筛选工具栏 ===== */
.filter-bar-modern {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.filter-group {
  display: flex;
  gap: 8px;
  flex: 1;
}
.filter-select {
  width: 130px;
}
.filter-search {
  width: 200px;
}
.filter-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* ===== 统计条 ===== */
.stats-bar-modern {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.stats-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-total b {
  color: var(--text-primary);
}
.stat-filtered {
  color: var(--primary-color);
  font-style: italic;
}
.stats-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-added { background: var(--success-color); }
.dot-modified { background: var(--warning-color); }
.dot-server { background: var(--text-muted); }
.stat-added-badge { color: var(--success-color); }
.stat-modified-badge { color: var(--warning-color); }
.stat-server-badge { color: var(--text-muted); }

/* ===== 批量操作栏 ===== */
.batch-bar-modern {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: #fef6eb;
  border-radius: 8px;
  border: 1px solid #f3d9b5;
}
.batch-icon {
  color: var(--warning-color);
  font-size: 16px;
}
.checked-hint {
  font-size: 13px;
  color: var(--warning-color);
  flex: 1;
}
.checked-hint b {
  font-size: 14px;
}
.batch-actions {
  display: flex;
  gap: 8px;
}

/* ===== 树节点 ===== */
.tree-node-modern {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  width: 100%;
  padding: 2px 0;
}
.node-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}
.node-label {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--text-primary);
}
.node-tag {
  margin-left: 4px;
  flex-shrink: 0;
}
.node-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.tree-node-modern:hover .node-actions {
  opacity: 1;
}
.action-btn {
  font-size: 12px;
  padding: 0 4px;
}
.ignore-btn {
  color: var(--text-muted) !important;
}
.ignore-btn:hover {
  color: var(--warning-color) !important;
}

:deep(.diff-el-tree .el-tree-node__content) {
  height: 34px;
  padding: 0 8px;
  border-radius: 4px;
}
:deep(.diff-el-tree .el-tree-node__content:hover) {
  background: var(--bg-secondary);
}

/* ===== 已忽略区域 ===== */
.ignored-section-modern {
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}
.ignored-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}
.ignored-tree-modern {
  opacity: 0.65;
}
.ignored-tree-modern :deep(.el-tree-node__content) {
  height: 32px;
}

/* ===== 预览抽屉 ===== */
.preview-panels-modern {
  display: flex;
  gap: 16px;
  height: calc(100vh - 120px);
}
.preview-panel-modern {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-card);
}
.preview-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}
.panel-label {
  color: var(--text-secondary);
  font-weight: 500;
}
.panel-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.template-badge {
  background: rgba(64, 123, 247, 0.1);
  color: var(--primary-color);
}
.server-badge {
  background: rgba(52, 184, 122, 0.1);
  color: var(--success-color);
}
.preview-content {
  flex: 1;
  margin: 0;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  overflow: auto;
  background: var(--bg-primary);
  white-space: pre;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}
.hl-common { color: var(--text-primary); }
.hl-removed { background: #fde8e8; color: var(--danger-color); display: block; border-radius: 2px; }
.hl-added { background: #e8f5ec; color: var(--success-color); display: block; border-radius: 2px; }
.preview-loading, .preview-error {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}
.preview-error {
  color: var(--danger-color);
}

.diff-tree-scroll {
  max-height: 300px;
  overflow-y: auto;
}

:deep(.diff-preview-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 20px 24px 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}
:deep(.diff-preview-drawer .el-drawer__body) {
  padding: 20px 24px;
  background: var(--bg-primary);
}
</style>
