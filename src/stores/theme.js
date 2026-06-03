import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('theme-dark') === 'true')

  function applyTheme(dark) {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      root.classList.add('dark-theme')
      root.style.setProperty('--bg-primary', '#1A1A2E')
      root.style.setProperty('--bg-secondary', '#16162A')
      root.style.setProperty('--bg-card', '#1E1E3A')
      root.style.setProperty('--bg-sidebar', '#0F0F23')
      root.style.setProperty('--bg-header', '#1A1A2E')
      root.style.setProperty('--text-primary', '#E0E0F0')
      root.style.setProperty('--text-secondary', '#9090B8')
      root.style.setProperty('--text-muted', '#6A6A8A')
      root.style.setProperty('--border-color', '#2A2A4A')
      root.style.setProperty('--sidebar-text', '#9090B8')
      root.style.setProperty('--sidebar-active', '#409EFF')
    } else {
      root.classList.remove('dark')
      root.classList.remove('dark-theme')
      root.style.setProperty('--bg-primary', '#F5F7FA')
      root.style.setProperty('--bg-secondary', '#FFFFFF')
      root.style.setProperty('--bg-card', '#FFFFFF')
      root.style.setProperty('--bg-sidebar', '#304156')
      root.style.setProperty('--bg-header', '#FFFFFF')
      root.style.setProperty('--text-primary', '#303133')
      root.style.setProperty('--text-secondary', '#606266')
      root.style.setProperty('--text-muted', '#909399')
      root.style.setProperty('--border-color', '#EBEEF5')
      root.style.setProperty('--sidebar-text', '#bfcbd9')
      root.style.setProperty('--sidebar-active', '#409EFF')
    }
    localStorage.setItem('theme-dark', dark)
  }

  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme(isDark.value)
  }

  // 初始化
  applyTheme(isDark.value)

  return { isDark, toggleTheme, applyTheme }
})
