<script setup lang="ts">
const { blocks, isFetching, isBlocksLoading, bodyClass } = useWikipediaArticle()
const { progress } = useTranslation()

const tooltipRef = ref<HTMLElement | null>(null)

// Tooltip state
const tooltip = reactive({
  show: false,
  data: null as any,
  x: 0,
  y: 0,
  isHovered: false // Whether the mouse is over the tooltip itself
})

function handleGlobalMouseOver(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement
  if (target) {
    try {
      const json = target.getAttribute('data-tooltip') || ''
      if (json) {
        // Only show and set position if not already showing the same content
        // or if moving from one tooltip to another
        const newData = JSON.parse(json)
        if (!tooltip.show || JSON.stringify(tooltip.data) !== JSON.stringify(newData)) {
          tooltip.data = newData
          tooltip.show = true
          // Fix position when first hovering
          updateTooltipPos(e)
        }
      }
    } catch (e) {
      tooltip.show = false
    }
  }
}

function handleGlobalMouseOut(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('[data-tooltip]')
  if (target) {
    // Increase grace period to allow mouse to move into the tooltip
    setTimeout(() => {
      if (!tooltip.isHovered) {
        tooltip.show = false
      }
    }, 300)
  }
}

function updateTooltipPos(e: MouseEvent) {
  const offset = 5 // Reduce offset to make it easier to reach
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  const width = tooltipRef.value?.offsetWidth || 300
  const height = tooltipRef.value?.offsetHeight || 100
  
  tooltip.x = Math.min(e.clientX + offset, viewportWidth - width - 20)
  tooltip.x = Math.max(10, tooltip.x)
  tooltip.y = Math.min(e.clientY + offset, viewportHeight - height - 20)
}

useHead({
  title: 'wikipedia-translation-helper',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    {
      rel: 'stylesheet',
      // Use the raw URL without any pre-processing to avoid double-encoding of '&'
      href: 'https://en.wikipedia.org/w/load.php?lang=en&modules=mediawiki.skinning.content.parsoid%7Cmediawiki.skinning.interface%7Csite.styles&only=styles&skin=vector'
    }
  ],
  bodyAttrs: {
    class: computed(() => bodyClass.value)
  }
})
</script>

<template>
  <div 
    class="min-h-screen bg-gray-50 flex flex-col font-sans"
    @mouseover="handleGlobalMouseOver"
    @mouseout="handleGlobalMouseOut"
  >
    <TheHeader />
    <div class="h-2 w-full bg-gray-200 overflow-hidden sticky top-[73px] z-10">
      <div 
        class="h-full bg-blue-600 transition-all duration-500 ease-out" 
        :style="{ width: progress + '%' }"
      ></div>
    </div>
    <main class="flex-1 overflow-y-auto">
      <div v-if="isBlocksLoading && !isFetching" class="flex items-center justify-center min-h-[50vh]">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p class="text-gray-500 font-medium">Loading your progress...</p>
        </div>
      </div>
      <template v-else-if="blocks.length > 0 || isFetching">
        <TranslationGrid />
      </template>
      <template v-else>
        <ArticleSelector />
      </template>
    </main>
    <WikitextExporter v-if="blocks.length > 0" />

    <!-- Global Table-based Tooltip -->
    <Teleport to="body">
      <div 
        v-if="tooltip.show && tooltip.data"
        ref="tooltipRef"
        class="fixed z-[9999] p-4 bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-300 w-max max-w-md pointer-events-auto"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        @mouseenter="tooltip.isHovered = true"
        @mouseleave="tooltip.isHovered = false; tooltip.show = false"
      >
        <!-- Template View -->
        <template v-if="tooltip.data.type === 'template'">
          <div class="flex items-center gap-2 border-b border-amber-200 pb-1.5 mb-2">
            <span class="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Template</span>
            <h3 class="text-sm font-bold text-gray-900">{{ tooltip.data.name }}</h3>
          </div>
          <table class="w-full text-[11px] border-collapse">
            <tr v-for="(val, key) in tooltip.data.params" :key="key" class="border-b border-gray-100 last:border-0">
              <td class="py-1 px-2 font-mono text-gray-900 bg-gray-100/50 font-bold w-16 align-top border-r border-gray-100 text-right">{{ key }}</td>
              <td class="py-1 px-2 text-gray-800 break-all leading-snug">{{ val || '-' }}</td>
            </tr>
          </table>
        </template>

        <!-- Link View -->
        <template v-else-if="tooltip.data.type === 'link'">
          <div class="flex items-center gap-2 border-b border-blue-200 pb-1.5 mb-2">
            <span class="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">Link</span>
            <h3 class="text-sm font-bold text-gray-900">Internal WikiLink</h3>
          </div>
          <table class="w-full text-[11px] border-collapse">
            <tr class="border-b border-gray-100">
              <td class="py-1 px-2 font-mono text-gray-900 bg-gray-100/50 font-bold w-16 border-r border-gray-100 text-right">Title</td>
              <td class="py-1.5 px-2 text-gray-800 break-all font-medium">{{ tooltip.data.title }}</td>
            </tr>
            <tr>
              <td class="py-1 px-2 font-mono text-gray-900 bg-gray-100/50 font-bold w-16 border-r border-gray-100 text-right">Label</td>
              <td class="py-1.5 px-2 text-gray-800 break-all">{{ tooltip.data.label }}</td>
            </tr>
          </table>
        </template>

        <!-- Reference View -->
        <template v-else-if="tooltip.data.type === 'reference'">
          <div class="flex items-center gap-2 border-b border-gray-200 pb-1.5 mb-2">
            <span class="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Reference</span>
            <h3 class="text-sm font-bold text-gray-900">{{ tooltip.data.label }}</h3>
          </div>
          <div 
            v-if="tooltip.data.content" 
            class="text-[11px] text-gray-700 leading-relaxed max-h-48 overflow-y-auto font-serif italic bg-gray-50 p-2 rounded border border-gray-100"
            v-html="tooltip.data.content"
          ></div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style>
/* Reset and basic layout only, no Wikipedia style overrides here */
body {
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
