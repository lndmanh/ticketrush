<script setup lang="ts">
import { ref, computed } from 'vue'
import { Newspaper, SearchXIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isEmpty } from 'es-toolkit/compat'
import { joinURL, withoutTrailingSlash } from 'ufo'

definePageMeta({
  layout: 'default',
})

const { t, locale } = useI18n()
const site = useSiteConfig()
const baseUrl = computed(() => site.url ? withoutTrailingSlash(site.url) : '')

const { data: posts, status } = await useAsyncData('blog-posts', () =>
  queryCollection('content')
    .where('path', 'LIKE', '/blogs/%')
    .order('publishedAt', 'DESC')
    .all(),
)

useSeo({
  title: computed(() => t('blog.seo_title')),
  description: computed(() => t('blog.seo_description')),
  type: 'website',
  collectionItems: computed(() => {
    if (!posts.value || !baseUrl.value) return undefined
    return posts.value.map(p => ({
      name: p.title || '',
      url: joinURL(baseUrl.value, p.path || ''),
    }))
  }),
})

// Category filter
const selectedCategory = ref<string | null>(null)
const searchQuery = ref('')

const categories: ComputedRef<string[]> = computed(() => {
  const postsValue = posts.value

  if (!postsValue || postsValue.length === 0) return []

  const uniqueSet = new Set<string>()

  postsValue.forEach((p) => {
    const cat = p.category

    if (typeof cat === 'string' && !isEmpty(cat)) {
      uniqueSet.add(cat.trim())
    }
  })

  return Array.from(uniqueSet).sort((a, b) => a.localeCompare(b))
})

const filteredPosts = computed(() => {
  if (!posts.value) return []
  let result = posts.value

  if (selectedCategory.value) {
    result = result.filter(p => p.category === selectedCategory.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(p =>
      p.title?.toLowerCase().includes(q)
      || p.description?.toLowerCase().includes(q)
      || p.tags?.some(t => t.toLowerCase().includes(q)),
    )
  }

  return result
})

const hasActiveFilter = computed(() => selectedCategory.value !== null || searchQuery.value.trim() !== '')

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function clearFilters() {
  selectedCategory.value = null
  searchQuery.value = ''
}
</script>

<template>
  <div class="container mx-auto px-4 py-16 lg:py-24 max-w-6xl font-sans">
    <header class="text-center mb-12">
      <h1 class="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
        {{ $t('blog.title') }}
      </h1>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">
        {{ $t('blog.subtitle') }}
      </p>
    </header>

    <!-- Categories -->
    <div class="flex flex-wrap justify-center gap-3 mb-16">
      <Button
        :variant="selectedCategory === null ? 'default' : 'outline'"
        class="rounded-full px-6 transition-colors"
        :class="[
          selectedCategory === null
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="selectedCategory = null"
      >
        {{ $t('blog.filter_all') }}
      </Button>
      <Button
        v-for="cat in categories"
        :key="cat"
        :variant="selectedCategory === cat ? 'default' : 'outline'"
        class="rounded-full px-6 transition-colors"
        :class="[
          selectedCategory === cat
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </Button>
    </div>

    <!-- Loading State -->
    <div
      v-if="status === 'pending'"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 mb-16"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-col"
      >
        <div class="w-full aspect-[4/3] rounded-3xl bg-primary/5 animate-pulse mb-6" />
        <div class="flex gap-2 mb-3">
          <div class="h-4 w-24 bg-primary/5 animate-pulse rounded" />
          <div class="h-4 w-16 bg-primary/5 animate-pulse rounded" />
        </div>
        <div class="h-6 w-3/4 bg-primary/10 animate-pulse rounded mb-3" />
        <div class="space-y-2">
          <div class="h-4 w-full bg-primary/5 animate-pulse rounded" />
          <div class="h-4 w-5/6 bg-primary/5 animate-pulse rounded" />
        </div>
      </div>
    </div>

    <!-- Content State -->
    <template v-else>
      <div
        v-if="filteredPosts.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 mb-16"
      >
        <NuxtLink
          v-for="post in filteredPosts"
          :key="post.path"
          :to="post.path"
          class="group cursor-pointer flex flex-col h-full"
        >
          <div class="relative w-full aspect-[4/3] rounded-3xl overflow-hidden mb-6 bg-muted">
            <img
              v-if="!isEmpty(post.ogImage?.url)"
              :src="post.ogImage?.url"
              :alt="post.title"
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            >
            <div
              v-else
              class="w-full h-full bg-primary/5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            >
              <Newspaper class="w-12 h-12 text-primary/20" />
            </div>
          </div>

          <div class="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <time :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
            <span class="text-border">&bull;</span>
            <Badge
              variant="secondary"
              class="font-normal bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3"
            >
              {{ post.category }}
            </Badge>
          </div>

          <h2 class="text-xl font-bold text-foreground mb-3 leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {{ post.title }}
          </h2>
          <p class="text-muted-foreground line-clamp-2 leading-relaxed flex-grow">
            {{ post.description }}
          </p>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredPosts.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <SearchXIcon class="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 class="text-xl font-bold text-foreground mb-2">
          {{ $t('blog.no_results_title') }}
        </h3>
        <p class="text-muted-foreground mb-6">
          {{ $t('blog.no_results_description') }}
        </p>
        <Button
          v-if="hasActiveFilter"
          variant="outline"
          class="rounded-full px-6"
          @click="clearFilters"
        >
          {{ $t('blog.clear_filters') }}
        </Button>
      </div>
    </template>

    <hr
      v-if="filteredPosts.length > 0"
      class="border-border mb-8"
    >
  </div>
</template>
