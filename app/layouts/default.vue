<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- Floating Island Header -->
    <div class="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4 transition-all duration-500 ease-out">
      <header
        class="w-full max-w-5xl transition-all duration-500 ease-out"
        :class="cn(
          'rounded-full border px-4 transition-all sm:px-6 lg:px-8',
          isScrolled
            ? 'border-border/40 bg-background/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md py-3'
            : 'border-border/10 bg-background/40 py-4 backdrop-blur-sm',
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
            <LangSwitcher
              v-if="i18nEnabled"
              :trigger-type="triggerType"
              :dropdown-type="dropdownType"
            />

            <!-- Theme Switcher -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <SunIcon class="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <MoonIcon class="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span class="sr-only">{{ $t('common.toggle_theme') }}</span>
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
            <Button
              size="sm"
              @click="handleHeaderCtaClick"
            >
              {{ headerCtaLabel }}
              <ArrowRight class="ml-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </nav>

          <!-- Mobile Controls -->
          <div class="flex items-center gap-0.5 md:hidden">
            <LayoutSearchButton
              :enable="headerSearch.enable"
              :in-aside="headerSearch.inAside"
              :style="'button'"
              :placeholder="headerSearch.placeholder"
            />

            <LangSwitcher
              v-if="i18nEnabled"
              :trigger-type="triggerType"
              :dropdown-type="dropdownType"
            />

            <!-- Theme Switcher (mobile) -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <SunIcon class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <MoonIcon class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span class="sr-only">{{ $t('common.toggle_theme') }}</span>
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
              :aria-label="$t('common.toggle_menu')"
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
                    class="group relative w-full py-2 touch-manipulation text-left"
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
                  class="w-full rounded-full px-8 text-base font-medium group relative overflow-hidden shadow-sm shadow-primary/20"
                  @click="handleHeaderCtaClick"
                >
                  {{ headerCtaLabel }}
                  <ArrowRight class="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>

            <!-- Panel 2: Submenu (children of the active parent) -->
            <div class="w-1/2 flex flex-col gap-2 px-12 overflow-y-auto">
              <template v-if="activeSubmenu !== null && headerNav[activeSubmenu]">
                <!-- Back button -->
                <button
                  class="group flex items-center gap-2 py-2 touch-manipulation text-muted-foreground transition-colors duration-300 hover:text-foreground"
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
    <main class="min-h-dvh">
      <div
        v-if="isDefaultLayoutContained"
        class="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:px-10"
      >
        <slot />
      </div>
      <slot v-else />
    </main>

    <footer class="border-t border-border/40 bg-background">
      <!-- Main Footer Content -->
      <div class="mx-auto max-w-[90rem] px-4 pt-14 pb-10 sm:px-6 lg:px-10 lg:pt-16 lg:pb-12">
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
                    {{ $t('footer.events') }}
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
                    {{ $t('footer.support') }}
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Platform -->
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/80">
                {{ $t('footer.platform') }}
              </h3>
              <ul class="mt-4 space-y-3">
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.sell_tickets') }}
                  </span>
                </li>
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.event_dashboard') }}
                  </span>
                </li>
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.check_in_tools') }}
                  </span>
                </li>
                <li>
                  <span class="text-[13px] text-muted-foreground">
                    {{ $t('footer.payout_support') }}
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
                    href="mailto:support@ticketrush.app"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    <MailIcon class="mr-2 inline-block size-4" />
                    {{ $t('footer.support_email') }}
                  </a>
                </li>
                <li>
                  <NuxtLink
                    to="/admin"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    <ArrowRight class="mr-2 inline-block size-4" />
                    {{ $t('footer.organizer_login') }}
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink
                    :to="localeSectionLink('faq')"
                    class="text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {{ $t('footer.help_center') }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Legal Bar -->
      <div class="border-t border-border/30">
        <div class="mx-auto max-w-[90rem] px-4 py-3 sm:px-6 lg:px-10">
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
                to="https://nnsvn.me/privacy"
                class="text-xs text-muted-foreground/60 transition-colors duration-200 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ $t('common.privacy') }}
              </NuxtLink>
              <span
                class="h-3 w-px bg-border/40"
                aria-hidden="true"
              />
              <NuxtLink
                to="https://nnsvn.me/terms"
                class="text-xs text-muted-foreground/60 transition-colors duration-200 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
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
import { Menu, X, ChevronLeft, ChevronRight, ArrowRight, SunIcon, MoonIcon, MailIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { APP_MANIFEST } from '#shared/constants/manifest'

const config = useConfig()

const headerNav = computed(() => config.value.header.nav)
const headerSearch = computed(() => config.value.search)
const route = useRoute()

const isDefaultLayoutContained = computed(() => route.meta.defaultLayoutContained !== false)

const activeSubmenu = ref<number | null>(null)

function openSubmenu(index: number) {
  activeSubmenu.value = index
}

function closeSubmenu() {
  activeSubmenu.value = null
}

const { enable: i18nEnabled, triggerType, dropdownType } = useConfig().value.header.languageSwitcher
const { loggedIn } = useUserSession()
const isMobileMenuOpen = ref(false)

const headerCtaLabel = computed(() => loggedIn.value ? 'My tickets' : 'Login')
const headerCtaTarget = computed(() => loggedIn.value ? '/tickets' : '/auth/login')

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

function localeSectionLink(sectionId: string): string {
  return `/#${sectionId}`
}

function handleHeaderCtaClick() {
  isMobileMenuOpen.value = false
  return navigateTo(headerCtaTarget.value)
}
</script>
