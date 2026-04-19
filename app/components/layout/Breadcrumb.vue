<template>
  <Breadcrumb>
    <BreadcrumbList>
      <template
        v-for="(breadcrumb, index) in breadcrumbs"
        :key="breadcrumb.title"
      >
        <BreadcrumbItem>
          <NuxtLinkLocale
            :href="index === 0 ? undefined : breadcrumb.href"
            class="hover:text-foreground transition-colors"
            :class="{ 'text-foreground': index === breadcrumbs.length - 1 }"
          >
            {{ breadcrumb.title }}
          </NuxtLinkLocale>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index !== breadcrumbs.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>

<script setup lang="ts">
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator } from '../ui/breadcrumb'

const { navigation } = usePageData()

const route = useRoute()
const breadcrumbs = useBreadcrumb(route.path, navigation.value)
</script>
