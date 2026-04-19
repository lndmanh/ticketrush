<template>
  <nav
    v-if="surroundings && surroundings.length > 0"
    aria-label="Page navigation"
    class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
  >
    <LayoutPrevNextButton
      v-if="surroundings[0]"
      :prev-next="surroundings[0]"
      side="left"
    />
    <!-- Empty spacer when only "next" exists -->
    <div
      v-else
      class="hidden sm:block"
    />
    <LayoutPrevNextButton
      v-if="surroundings[1]"
      :prev-next="surroundings[1]"
      side="right"
    />
  </nav>
</template>

<script setup lang="ts">
const { surroundings } = usePageData()
</script>
