<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <TheHeader />
    <main class="flex-1 overflow-y-auto">
      <TranslationGrid />
    </main>
    <WikitextExporter />
  </div>
</template>

<style>
/* Global styles for Wikipedia layout */
body {
  margin: 0;
  padding: 0;
}
</style>
