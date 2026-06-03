<template>
  <div class="mod-manager">
    <div class="page-header">
      <h3>{{ serverName }} — 模组管理</h3>
      <div class="header-actions">
        <el-button @click="scanMods">重新扫描</el-button>
        <el-button :loading="showProgress" @click="checkAllUpdates">
          {{ showProgress ? progressText : '检查更新' }}
        </el-button>
        <el-button type="primary" @click="onOpenModsFolder">打开 mods 文件夹</el-button>
      </div>
    </div>
    <div v-if="showProgress" class="progress-bar-wrap">
      <el-progress
        :percentage="progress"
        :text-inside="true"
        :stroke-width="18"
        :status="progress >= 100 ? 'success' : undefined"
      >
        <span>{{ progressText }}</span>
      </el-progress>
    </div>
    <div class="table-wrap">
      <ModList
        :mods="mods"
        @toggle="toggleMod"
        @delete="deleteMod"
        @batch-enable="batchEnable"
        @batch-disable="batchDisable"
        @batch-delete="batchDelete"
        @open-folder="openModFolder"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { confirmDelete, confirmBatch } from '@/utils/confirm'
import { showSuccess, showError, showWarning } from '@/utils/feedback'
import { useProgress } from '@/utils/progress'
import ModList from '@/components/ModList.vue'

const route = useRoute()
const serverId = computed(() => route.params.id)
const serverName = ref('')
const serverPath = ref('')
const mods = ref([])
const { showProgress, progress, progressText, start, update, complete } = useProgress()

// ---- 扫描 ----
async function scanMods() {
  if (!window.electronAPI) return
  if (!serverPath.value) { mods.value = []; return }
  const modsDir = `${serverPath.value}/mods`
  try {
    const files = await window.electronAPI.readDirectory(modsDir)
    const modList = []
    for (const file of files) {
      if (file.type === 'file' && (file.name.endsWith('.jar') || file.name.endsWith('.jar.disabled'))) {
        const isDisabled = file.name.endsWith('.disabled')
        const cleanName = isDisabled ? file.name.replace('.disabled', '') : file.name
        modList.push({
          fileName: file.name,
          displayName: cleanName.replace(/-\d+[\w.]*\.jar$/, ''),
          version: (cleanName.match(/[\d.]+(?=\.jar$)/) || [''])[0],
          enabled: !isDisabled,
          source: 'server-only',
          modrinthId: null,
          hasUpdate: false,
          path: file.path,
        })
      }
    }
    mods.value = modList
    showSuccess(`扫描完成，共 ${modList.length} 个模组`)
  } catch (err) {
    console.error('[scanMods] 扫描失败:', err)
    showError('扫描模组失败', err.message)
    mods.value = []
  }
}

// ---- 切换启用/禁用 ----
async function toggleMod(mod) {
  const oldPath = mod.path
  const newPath = mod.enabled
    ? oldPath.replace('.jar', '.jar.disabled')
    : oldPath.replace('.jar.disabled', '.jar')
  try {
    const result = await window.electronAPI.renameFile(oldPath, newPath)
    if (result) {
      mod.enabled = !mod.enabled
      mod.path = newPath
      mod.fileName = mod.enabled
        ? mod.fileName.replace('.disabled', '')
        : mod.fileName.endsWith('.disabled') ? mod.fileName : mod.fileName + '.disabled'
    } else {
      showError('操作失败')
    }
  } catch (err) {
    showError('操作失败', err.message || err)
  }
}

// ---- 删除 ----
async function deleteMod(mod) {
  const confirmed = await confirmDelete('确认删除', `确定删除 ${mod.fileName}？`)
  if (!confirmed) return
  try {
    const result = await window.electronAPI.deleteFile(mod.path)
    if (result) {
      mods.value = mods.value.filter(m => m.path !== mod.path)
      showSuccess('已删除')
    } else {
      showError('删除失败')
    }
  } catch (err) {
    showError('删除失败', err.message || err)
  }
}

// ---- 右键打开文件夹 ----
function openModFolder(mod) {
  if (window.electronAPI && window.electronAPI.openFolder) {
    window.electronAPI.openFolder(mod.path)
  }
}

// ---- 打开 mods 目录 ----
function onOpenModsFolder() {
  if (window.electronAPI && window.electronAPI.openFolder && serverPath.value) {
    window.electronAPI.openFolder(`${serverPath.value}/mods`)
  }
}

// ---- 批量操作 ----
async function batchEnable(selectedMods) {
  let success = 0
  let fail = 0
  for (const mod of selectedMods) {
    if (mod.enabled) { success++; continue }
    const oldPath = mod.path
    const newPath = oldPath.replace('.jar.disabled', '.jar')
    try {
      const result = await window.electronAPI.renameFile(oldPath, newPath)
      if (result) {
        mod.enabled = true
        mod.path = newPath
        mod.fileName = mod.fileName.replace('.disabled', '')
        success++
      } else { fail++ }
    } catch { fail++ }
  }
  showSuccess(`批量启用完成: ${success} 成功, ${fail} 失败`)
}

async function batchDisable(selectedMods) {
  let success = 0
  let fail = 0
  for (const mod of selectedMods) {
    if (!mod.enabled) { success++; continue }
    const oldPath = mod.path
    const newPath = oldPath.replace('.jar', '.jar.disabled')
    try {
      const result = await window.electronAPI.renameFile(oldPath, newPath)
      if (result) {
        mod.enabled = false
        mod.path = newPath
        mod.fileName = mod.fileName.endsWith('.disabled') ? mod.fileName : mod.fileName + '.disabled'
        success++
      } else { fail++ }
    } catch { fail++ }
  }
  showSuccess(`批量禁用完成: ${success} 成功, ${fail} 失败`)
}

async function batchDelete(selectedMods) {
  const confirmed = await confirmBatch('确认批量删除', selectedMods.length, `确定删除选中的 ${selectedMods.length} 个模组？`)
  if (!confirmed) return
  let success = 0
  let fail = 0
  for (const mod of selectedMods) {
    try {
      const result = await window.electronAPI.deleteFile(mod.path)
      if (result) {
        mods.value = mods.value.filter(m => m.path !== mod.path)
        success++
      } else { fail++ }
    } catch { fail++ }
  }
  showSuccess(`批量删除完成: ${success} 成功, ${fail} 失败`)
}

// ---- 检查更新 ----
async function checkAllUpdates() {
  if (!window.electronAPI) return
  if (mods.value.length === 0) {
    showWarning('没有模组需要检查')
    return
  }

  start('开始检查更新...', mods.value.length)

  for (const mod of mods.value) {
    try {
      // 简单检查: 调用后端 checkModUpdate
      const updateInfo = await window.electronAPI.checkModUpdate(mod)
      if (updateInfo && updateInfo.hasUpdate) {
        mod.hasUpdate = true
        if (updateInfo.latestVersion) mod.latestVersion = updateInfo.latestVersion
      } else {
        mod.hasUpdate = false
      }
    } catch {
      mod.hasUpdate = false
    }
    update()
  }

  const updatable = mods.value.filter(m => m.hasUpdate).length
  complete(`检查完成，${updatable} 个模组可更新`)
}

// ---- 初始化 ----
onMounted(async () => {
  if (window.electronAPI) {
    const servers = await window.electronAPI.getServers()
    const server = servers.find(s => s.id === serverId.value)
    if (server) {
      serverName.value = server.name
      serverPath.value = server.path
      await scanMods()
    }
  }
})
</script>

<style scoped>
.mod-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.page-header h3 {
  margin: 0;
  font-size: 16px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.progress-bar-wrap {
  margin-bottom: 12px;
  flex-shrink: 0;
}
.table-wrap {
  flex: 1;
  overflow: hidden;
}
</style>
