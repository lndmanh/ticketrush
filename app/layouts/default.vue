<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- Floating Island Header -->
    <div class="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 transition-all duration-500 ease-out">
      <header
        class="w-full max-w-5xl transition-all duration-500 ease-out"
        :class="cn(
          'rounded-full border px-8 transition-all',
          isScrolled
            ? 'border-border bg-background/40 shadow-lg backdrop-blur-xs shadow-black/8 py-3'
            : 'border-border/20 bg-background/60 py-4 backdrop-blur-xs',
        )"
      >
        <div class="flex h-full items-center justify-between">
          <!-- Logo -->
          <NuxtLink
            to="/"
            class="flex items-center gap-2.5 group transition-all duration-300"
            :class="isScrolled ? 'scale-[0.97]' : 'scale-100'"
          >
            <NuxtImg
              src="/favicon.svg"
              :alt="APP_MANIFEST.short_name"
              class="h-6 w-6 transition-all duration-300"
            />
            <span class="text-md font-semibold tracking-tight text-primary hover:text-foreground">
              {{ APP_MANIFEST.short_name }}
            </span>
          </NuxtLink>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-0.5">
            <LayoutHeaderNav />

            <Separator
              orientation="vertical"
              class="mx-3 h-4 bg-border/60"
            />

            <LayoutSearchButton
              :enable="headerSearch.enable"
              :in-aside="headerSearch.inAside"
              :style="'button'"
              :placeholder="headerSearch.placeholder"
            />

            <!-- Language Switcher Dropdown -->
            <LangSwitcher v-if="i18nEnabled" />

            <!-- Theme Switcher -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <SunIcon class="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <MoonIcon class="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span class="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
              >
                <ThemeSwitcher />
              </DropdownMenuContent>
            </DropdownMenu>

            <!-- CTA Button -->
            <Separator
              orientation="vertical"
              class="mx-3 h-4 bg-border/60"
            />
            <Motion
              :initial="{ opacity: 0, scale: 0.9 }"
              :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.5, delay: 0.3 }"
            >
              <Button
                size="sm"
                @click="navigateTo(locale == defaultLocale ? '#contact' : `/${locale}#contact`)"
              >
                {{ $t('cta.primary') }}
                <ArrowRight class="ml-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            </Motion>
          </nav>

          <!-- Mobile Controls -->
          <div class="flex items-center gap-0.5 md:hidden">
            <LayoutSearchButton
              :enable="headerSearch.enable"
              :in-aside="headerSearch.inAside"
              :style="'button'"
              :placeholder="headerSearch.placeholder"
            />

            <LangSwitcher v-if="i18nEnabled" />

            <!-- Theme Switcher (mobile) -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <SunIcon class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <MoonIcon class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span class="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
              >
                <ThemeSwitcher />
              </DropdownMenuContent>
            </DropdownMenu>

            <!-- Mobile Menu Toggle -->
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle menu"
              @click="isMobileMenuOpen = !isMobileMenuOpen"
            >
              <X
                v-if="isMobileMenuOpen"
                class="h-5 w-5"
              />
              <Menu
                v-else
                class="h-5 w-5"
              />
            </Button>
          </div>
        </div>
      </header>
    </div>

    <!-- Full-Page Mobile Menu -->
    <Transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="-translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-all duration-400 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="-translate-y-full"
    >
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-background/95 backdrop-blur-md md:hidden"
      >
        <nav class="h-full overflow-hidden pt-32">
          <!-- Sliding container: holds both panels side by side -->
          <div
            class="flex w-[200%] transition-transform duration-400 ease-out h-full"
            :style="{ transform: activeSubmenu !== null ? 'translateX(-50%)' : 'translateX(0)' }"
          >
            <!-- Panel 1: Root nav items -->
            <div class="w-1/2 flex flex-col gap-2 px-12 overflow-y-auto">
              <TransitionGroup
                enter-active-class="transition-all duration-500 ease-out"
                enter-from-class="opacity-0 translate-y-4"
                enter-to-class="opacity-100 translate-y-0"
                appear
              >
                <template
                  v-for="(item, index) in headerNav"
                  :key="index"
                >
                  <!-- Parent item with children -->
                  <button
                    v-if="item.links"
                    class="group relative w-full cursor-pointer py-2 touch-manipulation text-left"
                    :style="{ transitionDelay: `${index * 60}ms` }"
                    @click="openSubmenu(index)"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-3xl font-semibold tracking-tight text-foreground transition-all duration-300 group-hover:text-primary group-active:scale-95">
                        {{ $t(item.title) }}
                      </span>
                      <ChevronRight
                        class="h-7 w-7 shrink-0 text-primary translate-x-3 transition-all duration-300 ease-out group-hover:translate-x-0"
                      />
                    </div>
                    <span class="absolute bottom-2 left-0 h-0.5 w-0 bg-primary transition-all duration-400 ease-out group-hover:w-3/4" />
                  </button>

                  <!-- Direct link item -->
                  <NuxtLinkLocale
                    v-else
                    :to="item.to"
                    :target="item.target"
                    class="group relative w-full cursor-pointer py-2 touch-manipulation block"
                    :style="{ transitionDelay: `${index * 60}ms` }"
                    @click="isMobileMenuOpen = false"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-3xl font-semibold tracking-tight text-foreground transition-all duration-300 group-hover:text-primary group-active:scale-95">
                        {{ $t(item.title) }}
                      </span>
                      <ChevronRight
                        class="h-7 w-7 shrink-0 text-primary translate-x-3 transition-all duration-300 ease-out group-hover:translate-x-0"
                      />
                    </div>
                    <span class="absolute bottom-2 left-0 h-0.5 w-0 bg-primary transition-all duration-400 ease-out group-hover:w-3/4" />
                  </NuxtLinkLocale>
                </template>
              </TransitionGroup>

              <!-- Mobile CTA -->
              <div class="mt-8 pt-6 border-t border-border/20">
                <Button
                  size="lg"
                  class="w-full rounded-full px-8 text-base font-medium cursor-pointer group relative overflow-hidden shadow-sm shadow-primary/20"
                  @click="handleMobileNavClick('contact')"
                >
                  {{ $t('cta.primary') }}
                  <ArrowRight class="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>

            <!-- Panel 2: Submenu (children of the active parent) -->
            <div class="w-1/2 flex flex-col gap-2 px-12 overflow-y-auto">
              <template v-if="activeSubmenu !== null && headerNav[activeSubmenu]">
                <!-- Back button -->
                <button
                  class="group flex items-center gap-2 py-2 cursor-pointer touch-manipulation text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  @click="closeSubmenu()"
                >
                  <ChevronLeft class="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
                  <span class="text-lg font-medium">
                    {{ $t(headerNav[activeSubmenu].title) }}
                  </span>
                </button>

                <div class="mt-2 flex flex-col gap-1">
                  <NuxtLinkLocale
                    v-for="link in headerNav[activeSubmenu].links"
                    :key="link.title"
                    :to="link.to"
                    :target="link.target"
                    class="group relative w-full cursor-pointer py-3 touch-manipulation block"
                    @click="isMobileMenuOpen = false"
                  >
                    <div class="flex items-center gap-3">
                      <CtIcon
                        v-if="link.icon"
                        :name="link.icon"
                        :size="20"
                        class="shrink-0 text-primary"
                      />
                      <div>
                        <span class="text-2xl font-semibold tracking-tight text-foreground transition-all duration-300 group-hover:text-primary group-active:scale-95">
                          {{ $t(link.title || '') }}
                        </span>
                        <p
                          v-if="link.description"
                          class="mt-0.5 text-sm text-muted-foreground"
                        >
                          {{ $t(link.description) }}
                        </p>
                      </div>
                    </div>
                  </NuxtLinkLocale>
                </div>
              </template>
            </div>
          </div>
        </nav>
      </div>
    </Transition>

    <!-- Main Content -->
    <main>
      <slot />
    </main>

    <footer class="border-t border-border/40 bg-background">
      <!-- Main Footer Content -->
      <div class="mx-auto max-w-5xl px-6 pt-14 pb-10 lg:px-8 lg:pt-16 lg:pb-12">
        <div class="lg:grid lg:grid-cols-12 lg:gap-12">
          <!-- Brand -->
          <div class="lg:col-span-5">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2.5"
            >
              <NuxtImg
                src="/favicon.svg"
                :alt="APP_MANIFEST.short_name"
                class="h-6 w-6"
              />
              <span class="text-sm font-semibold tracking-tight text-foreground">
                {{ APP_MANIFEST.short_name }}
              </span>
            </NuxtLink>
            <p class="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              {{ $t('footer.tagline') }}
            </p>
          </div>

          <!-- Link Columns -->
          <div class="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7 lg:mt-0">
            <!-- Navigation -->
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/80">
                {{ $t('footer.navigation') }}
              </h3>
              <ul class="mt-4 space-y-3">
                <li>
                  <NuxtLink
                    :to="localeSectionLink('about')"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {{ $t('footer.about_us') }}
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink
                    :to="localeSectionLink('showcase')"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {{ $t('footer.our_work') }}
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink
                    :to="localeSectionLink('faq')"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {{ $t('footer.faq') }}
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink
                    :to="localeSectionLink('contact')"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {{ $t('footer.contact') }}
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Services -->
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/80">
                {{ $t('footer.services') }}
              </h3>
              <ul class="mt-4 space-y-3">
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.web_development') }}
                  </span>
                </li>
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.consulting') }}
                  </span>
                </li>
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.ui_design') }}
                  </span>
                </li>
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.maintenance') }}
                  </span>
                </li>
              </ul>
            </div>

            <!-- Connect -->
            <div class="col-span-2 sm:col-span-1">
              <h3 class="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/80">
                {{ $t('footer.connect') }}
              </h3>
              <ul class="mt-4 space-y-3">
                <li>
                  <a
                    href="mailto:contact@nnsvn.me"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    <MailIcon class="mr-2 inline-block size-4" />
                    Email
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/No-Name-Studio-VN"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    <GitHubIcon class="mr-2 inline-block size-4" />
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/nn_myt"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    <XIcon class="mr-2 inline-block size-4" />
                    X (Twitter)
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Legal Bar -->
      <div class="border-t border-border/30">
        <div class="mx-auto max-w-5xl px-6 py-5 lg:px-8">
          <div class="flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between">
            <div class="flex flex-col items-center gap-0.5 sm:items-start">
              <p class="text-xs text-muted-foreground/60">
                {{ $t('footer.copyright', { year: new Date().getFullYear() }) }}
              </p>
              <p class="text-[11px] text-muted-foreground/40">
                {{ $t('footer.made_in') }}
              </p>
            </div>
            <div class="flex items-center gap-5">
              <NuxtLink
                to="/privacy"
                class="text-xs text-muted-foreground/60 transition-colors duration-200 hover:text-foreground"
              >
                {{ $t('common.privacy') }}
              </NuxtLink>
              <span
                class="h-3 w-px bg-border/40"
                aria-hidden="true"
              />
              <NuxtLink
                to="/terms"
                class="text-xs text-muted-foreground/60 transition-colors duration-200 hover:text-foreground"
              >
                {{ $t('common.terms') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <BackToTop />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useWindowScroll } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CtIcon from '@/components/content/CtIcon.vue'
import { GitHubIcon, XIcon } from 'vue3-simple-icons'
import { Menu, X, ChevronLeft, ChevronRight, ArrowRight, SunIcon, MoonIcon, MailIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Motion } from 'motion-v'
import { defaultLocale } from '~~/i18n-constants'
import { APP_MANIFEST } from '#shared/constants/manifest'

const config = useConfig()

const headerNav = computed(() => config.value.header.nav)
const headerSearch = computed(() => config.value.search)

const activeSubmenu = ref<number | null>(null)

function openSubmenu(index: number) {
  activeSubmenu.value = index
}

function closeSubmenu() {
  activeSubmenu.value = null
}

const { locale } = useI18n()
const { i18nEnabled } = useI18nDocs()
const isMobileMenuOpen = ref(false)

const { y: scrollY } = useWindowScroll()
const isScrolled = computed(() => scrollY.value > 300)

// Close mobile menu on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isMobileMenuOpen.value) {
      isMobileMenuOpen.value = false
    }
  }
  window.addEventListener('keydown', handleEscape)
  onUnmounted(() => window.removeEventListener('keydown', handleEscape))
})

// Prevent body scroll when mobile menu is open
watch(isMobileMenuOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  }
  else {
    document.body.style.overflow = ''
    activeSubmenu.value = null
  }
})

function handleMobileNavClick(sectionId: string) {
  isMobileMenuOpen.value = false
  navigateTo(`/${locale}#${sectionId}`)
}

function localeSectionLink(sectionId: string): string {
  return locale.value === defaultLocale ? `/#${sectionId}` : `/${locale.value}/#${sectionId}`
}
</script>
