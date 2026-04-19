<template>
  <div class="[&:not(:first-child)]:mt-6">
    <div class="dark:hidden">
      <ProseImg
        v-bind="{
          src: props.srcLight,
          alt: props.alt,
          width: props.width,
          height: props.height,
          lifted: props.lifted,
          noZoom: props.noZoom,
        }"
      />
    </div>
    <div class="hidden dark:block">
      <ProseImg
        v-bind="{
          src: props.srcDark,
          alt: props.alt,
          width: props.width,
          height: props.height,
          lifted: props.lifted,
          noZoom: props.noZoom,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  srcLight: string
  srcDark: string
  alt?: string
  width?: string | number
  height?: string | number
  lifted: boolean
  noZoom: boolean
}>(), {
  alt: '',
  lifted: false,
  noZoom: false,
})
</script>
