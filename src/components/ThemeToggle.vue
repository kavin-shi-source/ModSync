<template>
  <el-tooltip :content="isDark ? '浅色模式' : '深色模式'" placement="bottom">
    <el-button
      :icon="isDark ? Sunny : Moon"
      circle
      size="small"
      @click="themeStore.toggleTheme()"
      class="theme-toggle-btn"
    />
  </el-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { Sunny, Moon } from '@element-plus/icons-vue'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)
</script>
