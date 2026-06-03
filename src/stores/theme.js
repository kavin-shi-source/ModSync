import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('theme-dark') === 'true')

  function applyTheme(dark) {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      root.classList.add('dark-theme')
      root.style.setProperty('--bg-primary', '#1a1b23')
      root.style.setProperty('--bg-secondary', '#22232f')
      root.style.setProperty('--bg-card', '#262735')
      root.style.setProperty('--bg-sidebar', '#1a1b23')
      root.style.setProperty('--bg-header', '#1a1b23')
      root.style.setProperty('--text-primary', '#d8dae3')
      root.style.setProperty('--text-secondary', '#8b8fa3')
      root.style.setProperty('--text-muted', '#5c5f73')
      root.style.setProperty('--border-color', '#33344a')
      root.style.setProperty('--sidebar-text', '#8b8fa3')
      root.style.setProperty('--sidebar-active', '#407bf7')
    } else {
      root.classList.remove('dark')
      root.classList.remove('dark-theme')
      /* Snowwolf 浅色风格 - 与 global.css :root 保持一致 */
      root.style.setProperty('--bg-primary', '#f5f6fa')
      root.style.setProperty('--bg-secondary', '#fcfcfd')
      root.style.setProperty('--bg-card', '#ffffff')
      root.style.setProperty('--bg-sidebar', '#fcfcfd')
      root.style.setProperty('--bg-header', '#ffffff')
      root.style.setProperty('--text-primary', '#2c2e33')
      root.style.setProperty('--text-secondary', '#6b707a')
      root.style.setProperty('--text-muted', '#9ca0aa')
      root.style.setProperty('--border-color', '#eaecf0')
      root.style.setProperty('--sidebar-text', '#6b707a')
      root.style.setProperty('--sidebar-active', '#407bf7')
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
