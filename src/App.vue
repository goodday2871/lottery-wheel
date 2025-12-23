<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex flex-col items-center p-4 sm:p-8">
    <div class="bg-white rounded-3xl shadow-2xl p-4 sm:p-8 max-w-4xl w-full">
      <!-- 轉盤完整區域：佔滿視窗高度 -->
      <div class="min-h-[calc(100dvh-2rem)] sm:min-h-[calc(100dvh-4rem)] flex flex-col">
        <h1 class="text-[60px] leading-[80px] font-bold text-center mb-4 sm:mb-8 text-gray-800">幸運轉盤</h1>

        <!-- 轉盤區域 -->
        <div class="flex flex-col items-center mb-4 sm:mb-8 flex-grow justify-center">
        <div class="relative" :style="{ width: canvasSize + 'px', height: canvasSize + 'px' }">
          <!-- 指針（右側） -->
          <div
            class="absolute top-1/2 z-10 right-0 -translate-y-1/2 translate-x-1/4"
          >
            <div
              class="w-0 h-0 drop-shadow-lg"
              :style="{
                borderTop: `${arrowSize * 0.5}px solid transparent`,
                borderBottom: `${arrowSize * 0.5}px solid transparent`,
                borderRight: `${arrowSize}px solid #ef4444`
              }"
            ></div>
          </div>

          <!-- Canvas 轉盤 -->
          <canvas
            ref="wheelCanvas"
            :width="canvasSize"
            :height="canvasSize"
            class="drop-shadow-2xl max-w-full h-auto"
          ></canvas>
        </div>

        <!-- 旋轉按鈕 -->
        <button
          @click="spin"
          :disabled="isSpinning || options.length < 2"
          class="mt-4 sm:mt-8 px-6 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-base sm:text-xl font-bold hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl"
        >
          {{ isSpinning ? '旋轉中...' : '開始抽獎' }}
        </button>
      </div>

        <!-- 說明文字 -->
        <div v-if="options.length < 2" class="text-center text-gray-500 text-xs sm:text-sm">
          請至少新增 2 個選項才能開始抽獎
        </div>
      </div>

      <!-- 編輯選項區域 -->
      <div class="pt-8 border-t-2 border-gray-200">
        <label class="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
          編輯選項（每行一個）：
        </label>
        <textarea
          v-model="optionsText"
          @input="updateOptions"
          rows="6"
          placeholder="請輸入選項，每行一個&#10;例如：&#10;1桌&#10;2桌&#10;3桌"
          class="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono resize-y text-sm sm:text-base"
        ></textarea>
        <div class="text-xs sm:text-sm text-gray-500 mt-2">
          目前共有 {{ options.length }} 個選項
        </div>
      </div>
    </div>

    <!-- 中獎彈出視窗 -->
    <div
      v-if="showPopup"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showPopup = false"
    >
      <div class="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md w-full transform animate-bounce-in">
        <div class="text-center">
          <div class="text-4xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
          <div class="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4">恭喜中獎！</div>
          <div class="text-3xl sm:text-5xl font-bold text-purple-600 mb-6 sm:mb-8">{{ winner }}</div>
          <button
            @click="confirmWinner"
            class="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full text-base sm:text-lg font-bold hover:from-green-500 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onUnmounted, nextTick } from 'vue'

const optionsText = ref('')
const options = ref([])
const winner = ref('')
const isSpinning = ref(false)
const wheelCanvas = ref(null)
const canvasSize = ref(400)
const rotation = ref(0)
const showPopup = ref(false)

// 根據 canvas 大小計算箭頭大小
const arrowSize = computed(() => {
  return canvasSize.value / 10 // 箭頭大小為轉盤的 1/10
})

// 根據 canvas 大小計算字體大小
const fontSize = computed(() => {
  return Math.max(12, canvasSize.value / 25) // 最小 12px，最大隨轉盤縮放
})

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788', '#E63946', '#457B9D'
]

// 計算合適的 canvas 大小
const calculateCanvasSize = () => {
  const width = window.innerWidth

  // 根據螢幕大小決定轉盤大小
  if (width < 640) {
    // 手機：螢幕寬度的 85%，最大 320px
    canvasSize.value = Math.min(width * 0.85, 320)
  } else if (width < 1024) {
    // 平板：固定 350px
    canvasSize.value = 350
  } else {
    // 桌面：固定 400px
    canvasSize.value = 400
  }

  // 確保是偶數，避免繪圖問題
  canvasSize.value = Math.floor(canvasSize.value / 2) * 2
}

const updateOptions = () => {
  const lines = optionsText.value.split('\n').filter(line => line.trim())
  options.value = lines
  drawWheel()
}

const drawWheel = () => {
  const canvas = wheelCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const size = canvasSize.value
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 10

  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation.value * Math.PI) / 180)

  const numOptions = options.value.length
  if (numOptions === 0) {
    ctx.restore()
    return
  }

  const anglePerOption = (2 * Math.PI) / numOptions

  options.value.forEach((option, index) => {
    const startAngle = index * anglePerOption
    const endAngle = startAngle + anglePerOption

    ctx.beginPath()
    ctx.fillStyle = colors[index % colors.length]
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fill()

    ctx.save()
    ctx.rotate(startAngle + anglePerOption / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `bold ${fontSize.value}px Arial`
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 3
    ctx.fillText(option, radius * 0.65, fontSize.value * 0.3)
    ctx.restore()

    ctx.beginPath()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = Math.max(1.5, size / 200)
    ctx.moveTo(0, 0)
    ctx.lineTo(
      Math.cos(endAngle) * radius,
      Math.sin(endAngle) * radius
    )
    ctx.stroke()
  })

  ctx.beginPath()
  ctx.fillStyle = '#FFFFFF'
  const centerCircleRadius = Math.max(10, size / 26)
  ctx.arc(0, 0, centerCircleRadius, 0, 2 * Math.PI)
  ctx.fill()
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = Math.max(2, size / 133)
  ctx.stroke()

  ctx.restore()
}

const spin = () => {
  if (isSpinning.value || options.value.length < 2) return

  isSpinning.value = true
  winner.value = ''
  showPopup.value = false

  // 隨機選擇中獎者（保證隨機性）
  const winnerIndex = Math.floor(Math.random() * options.value.length);
  console.log('隨機中獎索引:', winnerIndex, '中獎者:', options.value[winnerIndex])

  const anglePerOption = 360 / options.value.length

  // 添加隨機誤差，讓停止位置不是完全正中間（在選項範圍的 ±30% 內跳動）
  const randomOffset = (Math.random() - 0.5) * anglePerOption * 0.9
  const winnerAngle = winnerIndex * anglePerOption + anglePerOption / 2 + randomOffset

  const spins = Math.floor(5 + Math.random() * 3)
  const startRotation = rotation.value

  // 直接算「最終要停在哪」（右側 = 0 度）
  const finalRotation = 0 - winnerAngle + spins * 360

  const totalRotation = finalRotation - startRotation

  const duration = 4000
  const startTime = Date.now()

  const easeOutCubic = (t) => {
    return 1 - Math.pow(1 - t, 3)
  }

  const animate = () => {
    const currentTime = Date.now()
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    const easedProgress = easeOutCubic(progress)
    rotation.value = startRotation + totalRotation * easedProgress

    drawWheel()

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      rotation.value = (startRotation + totalRotation) % 360
      console.log('最終旋轉角度:', rotation.value)

      // 使用預先隨機選擇的中獎者
      winner.value = options.value[winnerIndex]
      isSpinning.value = false
      showPopup.value = true
    }
  }

  animate()
}

const confirmWinner = () => {
  showPopup.value = false
  winner.value = ''
}

// Resize 監聽器
let resizeTimeout
const handleResize = () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    calculateCanvasSize()
    drawWheel()
  }, 100)
}

onMounted(async () => {
  // 初始化 canvas 大小
  calculateCanvasSize()

  // 設定預設選項
  const defaultOptions = Array.from({ length: 20 }, (_, i) => `${i + 1}桌`)
  options.value = defaultOptions
  optionsText.value = defaultOptions.join('\n')

  // 等待 DOM 更新後再繪製轉盤
  await nextTick()

  // 確保 canvas 已經準備好
  if (wheelCanvas.value) {
    drawWheel()
  }

  // 添加視窗大小變更監聽器
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

watch(options, () => {
  drawWheel()
}, { deep: true })

watch(canvasSize, async () => {
  await nextTick()
  drawWheel()
})
</script>
