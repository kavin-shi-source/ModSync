import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 启用 CSS 代码分割，减少首屏 CSS 体积
    cssCodeSplit: true,
    // 启用源码映射会增大体积，生产环境不推荐
    sourcemap: false,
    rollupOptions: {
      output: {
        // 代码分割: 将第三方库单独打包，利用浏览器缓存
        manualChunks(id) {
          if (id.includes('node_modules/element-plus')) {
            return 'vendor-element'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    },
    // 压缩选项
    minify: 'esbuild',
    // 小于此大小的资源将内联为 base64 (减少 HTTP 请求)
    assetsInlineLimit: 4096
  },
  server: {
    port: 5173
  }
})
