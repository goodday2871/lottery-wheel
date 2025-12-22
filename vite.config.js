import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [
    vue(),
    viteSingleFile()
  ],
  base: './', // 使用相對路徑，確保在任何環境下都能運作
  build: {
    outDir: 'docs', // 輸出到 docs 目錄供 GitHub Pages 使用
    target: 'esnext',
    assetsInlineLimit: 100000000, // 確保所有資源都被內聯
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      inlineDynamicImports: true,
    },
  },
})
