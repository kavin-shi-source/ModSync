<template>
  <el-dialog
    v-model="visible"
    title="快速同步"
    width="640px"
    :close-on-click-modal="false"
    @close="onClose"
  >
    <el-steps :active="step" finish-status="success" align-center>
      <el-step title="选择服务器" />
      <el-step title="确认模板" />
      <el-step title="预览差异" />
      <el-step title="执行同步" />
    </el-steps>

    <!-- 步骤1：选择服务器 -->
    <div v-if="step === 0" class="wizard-step">
      <h4>选择要同步的服务器</h4>
      <div class="server-list">
        <div
          v-for="server in servers"
          :key="server.id"
          :class="['server-option', { selected: selectedServerId === server.id }]"
          @click="selectedServerId = server.id"
        >
          <el-radio :value="server.id" :model-value="selectedServerId" class="server-radio">
            <div class="server-radio-content">
              <span class="server-radio-name">{{ server.name }}</span>
              <span class="server-radio-path">{{ server.path }}</span>
            </div>
          </el-radio>
        </div>
      </div>
      <div v-if="servers.length === 0" class="step-empty">
        暂未配置服务器，请先在设置中添加
      </div>
    </div>

    <!-- 步骤2：确认模板 -->
    <div v-if="step === 1" class="wizard-step">
      <h4>确认模板路径</h4>
      <div class="template-info">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="模板路径">
            {{ templatePath || '未配置' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <div v-if="!templatePath" class="step-empty">
        <p>模板路径未配置，无法继续同步</p>
        <el-button type="primary" @click="goToSettings">去设置</el-button>
      </div>
    </div>

    <!-- 步骤3：预览差异 -->
    <div v-if="step === 2" class="wizard-step">
      <h4>差异预览</h4>
      <div v-if="!diffsScanned" class="scan-prompt">
        <p>已选择服务器「{{ selectedServer?.name }}」，点击下方按钮扫描差异</p>
        <el-button
          type="primary"
          :loading="scanningDiffs"
          @click="scanDiffs"
        >
          {{ scanningDiffs ? '扫描中...' : '扫描差异' }}
        </el-button>
      </div>
      <template v-else>
        <div v-if="diffSummary" class="diff-summary">
          <el-tag v-if="diffSummary.added > 0" size="small" type="success">
            新增: {{ diffSummary.added }}
          </el-tag>
          <el-tag v-if="diffSummary.modified > 0" size="small" type="warning">
            修改: {{ diffSummary.modified }}
          </el-tag>
          <el-tag v-if="diffSummary.serverOnly > 0" size="small" type="info">
            服务器独有: {{ diffSummary.serverOnly }}
          </el-tag>
          <span class="diff-total">共 {{ totalDiff }} 项</span>
        </div>
        <div v-if="totalDiff > 0" class="diff-expand-section">
          <el-button
            size="small"
            type="primary"
            link
            @click="showDiffTree = !showDiffTree"
          >
            {{ showDiffTree ? '收起差异树' : '展开完整差异树' }}
          </el-button>
        </div>
        <div v-if="showDiffTree && currentDiffs.length > 0" class="diff-tree-wrapper">
          <DiffTree
            :diffs="currentDiffs"
            :ignored-paths="[]"
            compact-mode
          />
        </div>
        <div v-if="totalDiff === 0" class="step-empty">
          该服务器与模板完全一致，无需同步
        </div>
      </template>
    </div>

    <!-- 步骤4：执行同步 -->
    <div v-if="step === 3" class="wizard-step">
      <h4>正在同步...</h4>
      <div class="sync-execute-area">
        <el-progress
          :percentage="syncProgress.progress.value"
          :text-inside="true"
          :stroke-width="24"
          :status="syncProgress.progress.value >= 100 ? 'success' : undefined"
        >
          <span>{{ syncProgress.progressText.value }}</span>
        </el-progress>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <el-button v-if="step > 0 && step < 3" @click="prevStep">上一步</el-button>
      <el-button
        v-if="step === 0"
        type="primary"
        :disabled="!selectedServerId"
        @click="nextStep"
      >
        下一步
      </el-button>
      <el-button
        v-if="step === 1"
        type="primary"
        :disabled="!templatePath"
        @click="nextStep"
      >
        下一步
      </el-button>
      <el-button
        v-if="step === 2"
        type="primary"
        :disabled="!diffsScanned || scanningDiffs"
        :loading="scanningDiffs"
        @click="nextStep"
      >
        {{ !diffsScanned ? '请先扫描差异' : totalDiff > 0 ? '开始同步' : '完成' }}
      </el-button>
      <el-button v-if="step === 3" type="primary" disabled>
        同步中...
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { showError } from '@/utils/feedback'
import { useProgress } from '@/utils/progress'
import { executeSync } from '@/utils/sync'
import DiffTree from '@/components/DiffTree.vue'

const props = defineProps({
  servers: { type: Array, default: () => [] },
  templatePath: { type: String, default: '' },
  serverDiffs: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close', 'done'])

const router = useRouter()
const store = useAppStore()

const visible = ref(true)
const step = ref(0)
const selectedServerId = ref('')
const currentDiffs = ref([])
const scanningDiffs = ref(false)
const diffsScanned = ref(false)
const showDiffTree = ref(false)
const syncing = ref(false)
const syncProgress = useProgress()

const selectedServer = computed(() =>
  props.servers.find(s => s.id === selectedServerId.value)
)

const totalDiff = computed(() => currentDiffs.value.length)

const diffSummary = computed(() => {
  const result = { added: 0, modified: 0, deleted: 0, serverOnly: 0 }
  for (const d of currentDiffs.value) {
    if (result[d.type] !== undefined) result[d.type]++
  }
  return result
})

async function scanDiffs() {
  scanningDiffs.value = true
  diffsScanned.value = false
  const server = selectedServer.value
  if (!server || !props.templatePath) {
    showError('请先选择服务器并确认模板路径')
    scanningDiffs.value = false
    return
  }
  try {
    const result = await window.electronAPI.diffDirectories(props.templatePath, server.path, [])
    currentDiffs.value = [
      ...result.added.filter(f => f.type === 'templateOnly').map(f => ({ ...f, type: 'added', label: '新增', actionText: '推送到服务器' })),
      ...result.added.filter(f => f.type === 'serverOnly').map(f => ({ ...f, type: 'serverOnly', label: '服务器独有', actionText: '收集到模板' })),
      ...result.modified.map(f => ({ ...f, type: 'modified', label: '已修改', actionText: '推送到服务器' })),
    ]
    diffsScanned.value = true
  } catch (err) {
    currentDiffs.value = []
    diffsScanned.value = false
    showError('扫描差异失败', err.message)
  }
  scanningDiffs.value = false
}

function nextStep() {
  if (step.value === 2) {
    if (totalDiff.value === 0) {
      onClose()
      return
    }
    step.value = 3
    executeSyncFromWizard()
    return
  }
  step.value++
}

function prevStep() {
  if (step.value > 0) step.value--
}

async function executeSyncFromWizard() {
  const server = selectedServer.value
  if (!server) return

  const diffList = currentDiffs.value.map(d => ({
    ...d,
    relativePath: d.relativePath,
    templateFile: d.templateFile,
    serverFile: d.serverFile,
    type: d.type
  }))

  const serverDiffsMap = { [server.id]: currentDiffs.value }

  await executeSync(diffList, {
    servers: [server],
    serverDiffs: serverDiffsMap,
    templatePath: props.templatePath,
    syncing,
    syncProgress
  })

  // 重新扫描该服务器以刷新状态
  try {
    const result = await window.electronAPI.diffDirectories(props.templatePath, server.path, [])
    const newDiffs = [
      ...result.added.filter(f => f.type === 'templateOnly').map(f => ({ ...f, type: 'added', label: '新增', actionText: '推送到服务器' })),
      ...result.added.filter(f => f.type === 'serverOnly').map(f => ({ ...f, type: 'serverOnly', label: '服务器独有', actionText: '收集到模板' })),
      ...result.modified.map(f => ({ ...f, type: 'modified', label: '已修改', actionText: '推送到服务器' })),
    ]
    store.refreshDiffCounts({ [server.id]: newDiffs })
    store.updateDashboardData({
      lastScanTime: new Date().toLocaleString(),
      cachedDiffs: { [server.id]: newDiffs }
    })
  } catch {
    // 忽略重新扫描失败
  }

  emit('done')
}

function goToSettings() {
  onClose()
  router.push('/settings')
}

function onClose() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.wizard-step {
  padding: 24px 0;
  min-height: 200px;
}
.wizard-step h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #303133;
}
.server-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.server-option {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.server-option:hover {
  border-color: #409eff;
  background: #f5f7fa;
}
.server-option.selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.server-radio {
  display: flex;
  align-items: center;
  width: 100%;
}
.server-radio-content {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
}
.server-radio-name {
  font-weight: 600;
  color: #303133;
}
.server-radio-path {
  font-size: 12px;
  color: #909399;
}
.template-info {
  margin-bottom: 16px;
}
.diff-summary {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.diff-total {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}
.diff-expand-section {
  margin-bottom: 8px;
}
.diff-tree-wrapper {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
}
.sync-execute-area {
  padding: 32px 0;
}
.step-empty {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}
.scan-prompt {
  text-align: center;
  padding: 40px 0;
}
.scan-prompt p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
}
</style>
