import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const config = ref({})
  const servers = ref([])
  const currentServerId = ref(null)
  const modCount = ref(0)
  const updateCount = ref(0)
  const syncStatus = ref('空闲')

  function setCurrentServer(id) {
    currentServerId.value = id
  }

  return {
    config, servers, currentServerId,
    modCount, updateCount, syncStatus,
    setCurrentServer
  }
})
