<template>
  <AuroraBackground>
    <motion.div
      :initial="{ opacity: 0, filter: 'blur(10px)' }"
      :while-in-view="{
        opacity: 1,
        filter: 'blur(0px)',
      }"
      class="w-full relative"
    >
      <slot />
    </motion.div>
  </AuroraBackground>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
</script>
