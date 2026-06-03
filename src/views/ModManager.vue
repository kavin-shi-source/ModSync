<template>
  <div class="mod-manager">
    <div class="page-header">
      <h3>{{ serverName }} — 模组管理</h3>
      <el-button @click="scanMods">重新扫描</el-button>
      <el-button :loading="checkingUpdates" @click="checkAllUpdates">检查更新</el-button>
    </div>
    <ModList
      :mods="mods"
      @install="showInstallDialog"
      @toggle="toggleMod"
      @update="updateMod"
      @delete="deleteMod"
    />

    <!-- Modrinth 安装对话框 -->
    <el-dialog v-model="installVisible" title="从 Modrinth 安装模组" width="600px">
      <el-input v-model="searchQuery" placeholder="搜索模组..." @keyup.enter="searchModrinth">
        <template #append>
          <el-button @click="searchModrinth">搜索</el-button>
        </template>
      </el-input>
      <div v-if="searchResults.length > 0" style="margin-top:16px">
        <el-card
          v-for="hit in searchResults"
          :key="hit.project_id"
          style="margin-bottom:8px; cursor:pointer"
          @click="selectModVersion(hit)"
        >
          <div style="display:flex; justify-content:space-between; align-items:center">
            <div>
              <strong>{{ hit.title }}</strong>
              <p style="margin:4px 0 0; font-size:12px; color:#909399">{{ hit.description }}</p>
            </div>
            <el-tag>{{ hit.latest_version }}</el-tag>
          </div>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="installVisible = false">取消</el-button>
      </template>
    </el-dialog>

    <!-- 版本选择对话框 -->
    <el-dialog v-model="versionVisible" title="选择版本" width="500px">
      <el-radio-group v-model="selectedVersion" direction="vertical">
        <el-radio
          v-for="v in availableVersions"
          :key="v.id"
          :value="v.id"
          style="margin-bottom:8px"
        >
          {{ v.version_number }} ({{ v.game_versions?.join(', ') }})
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="versionVisible = false">取消</el-button>
        <el-button type="primary" :loading="downloading" @click="confirmInstall">确认安装</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ModList from '@/components/ModList.vue'

const route = useRoute()
const serverId = computed(() => route.params.id)
const serverName = ref('')
const serverPath = ref('')
const mods = ref([])
const checkingUpdates = ref(false)

// 安装对话框
const installVisible = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const versionVisible = ref(false)
const availableVersions = ref([])
const selectedVersion = ref('')
const selectedModInfo = ref(null)
const downloading = ref(false)

async function scanMods() {
  if (!window.electronAPI) return
  const modsDir = `${serverPath.value}/mods`
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
}

async function toggleMod(mod) {
  const oldPath = mod.path
  const newPath = mod.enabled
    ? oldPath.replace('.jar', '.jar.disabled')
    : oldPath.replace('.jar.disabled', '.jar')
  const result = await window.electronAPI.renameFile(oldPath, newPath)
  if (result.success) {
    mod.enabled = !mod.enabled
    mod.path = newPath
    mod.fileName = mod.enabled ? mod.fileName.replace('.disabled', '') : mod.fileName + '.disabled'
    ElMessage.success(mod.enabled ? '已启用' : '已禁用')
  } else {
    ElMessage.error('操作失败: ' + result.error)
  }
}

async function deleteMod(mod) {
  try {
    await ElMessageBox.confirm(`确定删除 ${mod.fileName}？`, '确认删除')
    const result = await window.electronAPI.deleteFile(mod.path)
    if (result.success) {
      mods.value = mods.value.filter(m => m.path !== mod.path)
      ElMessage.success('已删除')
    } else {
      ElMessage.error('删除失败: ' + result.error)
    }
  } catch { /* 用户取消 */ }
}

async function updateMod(mod) {
  if (!mod.modrinthId) {
    ElMessage.warning('该模组并非来自 Modrinth，无法自动更新')
    return
  }
  try {
    const versions = await window.electronAPI.getModVersions(mod.modrinthId)
    if (versions && versions.length > 0) {
      const latest = versions[0]
      const primaryFile = latest.files?.find(f => f.primary) || latest.files?.[0]
      if (primaryFile) {
        await window.electronAPI.downloadMod(primaryFile.url, mod.path)
        ElMessage.success('更新完成')
        await scanMods()
      }
    }
  } catch (err) {
    ElMessage.error('更新失败: ' + err.message)
  }
}

async function showInstallDialog() {
  installVisible.value = true
  searchResults.value = []
  searchQuery.value = ''
}

async function searchModrinth() {
  if (!searchQuery.value) return
  const result = await window.electronAPI.searchMods(searchQuery.value)
  searchResults.value = result.hits || []
}

async function selectModVersion(hit) {
  selectedModInfo.value = hit
  const versions = await window.electronAPI.getModVersions(hit.project_id)
  availableVersions.value = versions || []
  versionVisible.value = true
}

async function confirmInstall() {
  if (!selectedVersion.value) { ElMessage.warning('请选择版本'); return }
  downloading.value = true
  try {
    const version = availableVersions.value.find(v => v.id === selectedVersion.value)
    const primaryFile = version.files?.find(f => f.primary) || version.files?.[0]
    if (primaryFile) {
      const destPath = `${serverPath.value}/mods/${primaryFile.filename}`
      await window.electronAPI.downloadMod(primaryFile.url, destPath)
      ElMessage.success('安装成功')
      installVisible.value = false
      versionVisible.value = false
      await scanMods()
    }
  } catch (err) {
    ElMessage.error('安装失败: ' + err.message)
  } finally {
    downloading.value = false
  }
}

async function checkAllUpdates() {
  checkingUpdates.value = true
  let updated = 0
  for (const mod of mods.value) {
    if (!mod.modrinthId) {
      try {
        const info = await window.electronAPI.identifyMod(mod.fileName)
        if (info) {
          mod.modrinthId = info.modrinthId
          mod.displayName = info.displayName
          mod.latestVersion = info.latestVersion
        }
      } catch { /* 跳过 */ }
    }
    if (mod.modrinthId) {
      try {
        const versions = await window.electronAPI.getModVersions(mod.modrinthId)
        if (versions && versions.length > 0) {
          const latest = versions[0].version_number
          if (latest !== mod.version) {
            mod.hasUpdate = true
            mod.latestVersion = latest
            updated++
          }
        }
      } catch { /* 跳过 */ }
    }
  }
  checkingUpdates.value = false
  ElMessage.success(`检查完成，${updated} 个模组可更新`)
}

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
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
</style>
