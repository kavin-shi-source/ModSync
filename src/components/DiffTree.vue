<template>
  <div class="diff-tree">
    <!-- 有差异时的主树 -->
    <div v-if="activeDiffs.length > 0">
      <div v-if="checkedCount > 0" class="batch-bar">
        <span class="checked-hint">已选中 {{ checkedCount }} 项</span>
        <el-button size="small" type="warning" @click="onBatchIgnore">批量忽略</el-button>
        <el-button size="small" @click="clearCheck">取消选择</el-button>
      </div>
      <el-tree
        ref="treeRef"
        :data="activeTreeData"
        :props="treeProps"
        node-key="id"
        show-checkbox
        default-expand-all
        @check="onCheck"
        @check-change="onCheckChange"
      >
        <template #default="{ node, data }">
          <span class="custom-node">
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
              type="warning"
              class="action-btn"
              @click.stop="onIgnore(data._diffItem)"
            >
              忽略
            </el-button>
          </span>
        </template>
      </el-tree>
    </div>
    <div v-else class="empty">✅ 所有服务器与模板保持一致</div>

    <!-- 已忽略项目区域（文件树形式） -->
    <div v-if="ignoredList.length > 0" class="ignored-section">
      <el-collapse>
        <el-collapse-item :title="`已忽略项目 (${ignoredList.length})`" name="ignored">
          <el-tree
            ref="ignoredTreeRef"
            :data="ignoredTreeData"
            :props="treeProps"
            node-key="id"
            default-expand-all
            class="ignored-tree"
          >
            <template #default="{ data }">
              <span class="custom-node">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { confirmBatch } from '@/utils/confirm'
import { showWarning } from '@/utils/feedback'

const props = defineProps({
  diffs: { type: Array, default: () => [] },
  ignoredPaths: { type: Array, default: () => [] }, // Set of ignored relative paths
})

const emit = defineEmits(['ignore', 'unignore', 'batchIgnore', 'check'])

const treeRef = ref(null)
const ignoredTreeRef = ref(null)
const treeProps = { children: 'children', label: 'label' }

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

const activeTreeData = computed(() => buildTree(activeDiffs.value))

function onIgnore(diff) {
  emit('ignore', diff)
}

function onUnignore(diff) {
  emit('unignore', diff)
}

const checkedCount = ref(0)

function onCheck(data, { checkedKeys }) {
  // 父节点选中/取消时，同步所有子节点状态
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

defineExpose({ getCheckedDiffs, clearCheck, setCheckAll })
</script>

<style scoped>
.diff-tree {
  min-height: 60px;
}
.empty {
  text-align: center;
  padding: 30px;
  color: #67c23a;
  font-size: 15px;
}
.custom-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  width: 100%;
}
.node-icon {
  font-size: 14px;
  line-height: 1;
}
.node-label {
  font-family: monospace;
  flex-shrink: 0;
}
.node-tag {
  margin-left: 4px;
  flex-shrink: 0;
}
.action-btn {
  margin-left: auto;
  flex-shrink: 0;
}
:deep(.el-tree-node__content) {
  height: 34px;
}
.ignored-section {
  margin-top: 16px;
  border-top: 1px dashed #dcdfe6;
  padding-top: 8px;
}
.ignored-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 13px;
  opacity: 0.7;
}
.ignored-tree {
  opacity: 0.75;
}
.ignored-tree :deep(.el-tree-node__content) {
  height: 32px;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #fdf6ec;
  border-radius: 4px;
  border: 1px solid #faecd8;
}
.checked-hint {
  font-size: 13px;
  color: #e6a23c;
  margin-right: auto;
}
</style>
