import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const config = ref({})
  const servers = ref([])
  const currentServerId = ref(null)
  const modCount = ref(0)
  const syncStatus = ref('空闲')
  const totalDiffCount = ref(0)
  const dashboardData = ref(null)

  function setCurrentServer(id) {
    currentServerId.value = id
  }

  function refreshDiffCounts(serverDiffs) {
    totalDiffCount.value = Object.values(serverDiffs).reduce((sum, diffs) => sum + diffs.length, 0)
  }

  function updateDashboardData(data) {
    dashboardData.value = data
  }

  return {
    config, servers, currentServerId,
    modCount, syncStatus,
    totalDiffCount, dashboardData,
    setCurrentServer,
    refreshDiffCounts, updateDashboardData
  }
})
