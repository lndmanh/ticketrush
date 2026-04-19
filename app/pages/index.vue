<script setup lang="ts">
import { isEmpty } from 'es-toolkit/compat'
import { defaultLocale } from '~~/i18n-constants'
import { APP_MANIFEST } from '#shared/constants/manifest'

definePageMeta({
  breadcrumb: 'Home',
})

useSeo({
  title: APP_MANIFEST.short_name,
  description: APP_MANIFEST.description,
  type: 'website',
})

const { locale } = useI18n()
const contentId = computed(() => locale.value === defaultLocale ? 'landing/landing.yml' : `landing/${locale.value}/landing.yml`)

const { data: page } = await useAsyncData(`landing-content-${locale.value}`, () => {
  return queryCollection('landing').where('id', '=', contentId.value).first()
}, { watch: [contentId] })

const route = useRoute()
if (!isEmpty(route.hash)) {
  const sectionId = route.hash.substring(1)
  setTimeout(() => scrollToSection(sectionId), 300)
}

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId)
  if (element) {
    const headerOffset = 80
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.scrollY - headerOffset
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
  }
}
</script>

<template>
  <div v-if="page">
    <div class="container py-16">
      <div class="prose max-w-none">
        <h1>{{ page.hero.title }}</h1>
        <p>{{ page.hero.subtitle }}</p>
      </div>
    </div>
  </div>
</template>
