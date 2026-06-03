<template>
  <div class="server-view">
    <div class="page-header">
      <h3>{{ currentServer?.name || '服务器' }}</h3>
      <span class="path-hint">{{ currentServer?.path }}</span>
    </div>
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-statistic title="模组总数" :value="modCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="已启用" :value="enabledCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="已禁用" :value="disabledCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="可更新" :value="updateCount" />
      </el-col>
    </el-row>
    <el-button type="primary" @click="goToMods">管理模组</el-button>
    <el-button @click="goToSync">同步到模板</el-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const serverId = computed(() => route.params.id)
const currentServer = computed(() => store.servers.find(s => s.id === serverId.value))
const modCount = ref(0)
const enabledCount = ref(0)
const disabledCount = ref(0)
const updateCount = ref(0)

function goToMods() { router.push(`/server/${serverId.value}/mods`) }
function goToSync() { router.push('/sync') }

onMounted(() => {
  store.setCurrentServer(serverId.value)
})
</script>

<style scoped>
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.path-hint { color: #909399; font-size: 12px; }
</style>
