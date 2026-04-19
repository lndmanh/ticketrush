<script setup lang="ts">
import { motion } from 'motion-v'
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const error = useError()

const handleError = () => {
  clearError({
    redirect: '/',
  })
}
</script>

<template>
  <AuroraBackground>
    <motion.div
      as="div"
      :initial="{ opacity: 0, filter: 'blur(10px)' }"
      :while-in-view="{
        opacity: 1,
        filter: 'blur(0px)',
      }"
      :transition="{
        duration: 0.3,
        ease: 'easeInOut',
      }"
    >
      <MaxWidthWrapper class="h-screen relative flex flex-col items-center justify-center gap-4 px-4">
        <h1
          v-if="error"
          class="text-8xl font-bold tracking-tighter text-foreground/10 md:text-[180px] lg:text-[250px] leading-none text-center"
        >
          {{ error.statusCode }}
        </h1>
        <h2
          v-if="error"
          class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-center"
        >
          {{ error.message }}
        </h2>
        <p class="text-lg text-muted-foreground text-center">
          Whoops, you've ventured off the map. The page you're looking for doesn't exist.
        </p>
        <div class="mt-4 flex items-center justify-center gap-4">
          <Button
            @click="handleError"
          >
            <ArrowLeft class="h-4 w-4" />
            Go Back Home
          </Button>
        </div>
      </MaxWidthWrapper>
    </motion.div>
  </AuroraBackground>
</template>
