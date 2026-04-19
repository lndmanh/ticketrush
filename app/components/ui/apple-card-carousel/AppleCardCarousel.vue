<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from "vue";
import { CarouselKey } from "./AppleCarouselContext";
import { ChevronLeftIcon, ChevronRightIcon } from "@lucide/vue";
import { Button } from "../button";

interface Props {
  initialScroll?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialScroll: 0,
});

const carouselRef = ref<HTMLDivElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(true);
const currentIndex = ref(0);

onMounted(() => {
  if (carouselRef.value) {
    carouselRef.value.scrollLeft = props.initialScroll;
    checkScrollability();
  }
});

watch(
  () => props.initialScroll,
  (newVal) => {
    if (carouselRef.value) {
      carouselRef.value.scrollLeft = newVal;
      checkScrollability();
    }
  },
);

function checkScrollability() {
  if (carouselRef.value) {
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.value;
    canScrollLeft.value = scrollLeft > 0;
    canScrollRight.value = scrollLeft < scrollWidth - clientWidth;
  }
}

function scrollLeft() {
  if (carouselRef.value) {
    carouselRef.value.scrollBy({ left: -300, behavior: "smooth" });
  }
}

function scrollRight() {
  if (carouselRef.value) {
    carouselRef.value.scrollBy({ left: 300, behavior: "smooth" });
  }
}

function handleCardClose(index: number) {
  if (carouselRef.value) {
    const cardWidth = isMobile.value ? 230 : 384; // (md:w-96)
    const gap = isMobile.value ? 4 : 8;
    const scrollPosition = (cardWidth + gap) * (index + 1);
    carouselRef.value.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
    currentIndex.value = index;
  }
}

const isMobile = computed(() => {
  return window && window.innerWidth < 768;
});

provide(CarouselKey, {
  onCardClose: handleCardClose,
  currentIndex,
});
</script>

<template>
  <div class="relative w-full">
    <div
      ref="carouselRef"
      class="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-10 [scrollbar-width:none] md:py-20"
      @scroll="checkScrollability"
    >
      <div class="absolute right-0 z-[1000] h-auto w-[5%] overflow-hidden bg-gradient-to-l" />

      <div class="mx-auto flex max-w-7xl flex-row justify-start gap-4 pl-4">
        <slot />
      </div>
    </div>
    <div class="mr-10 flex justify-end gap-2">
      <Button
        class="relative z-40 flex size-10 items-center justify-center rounded-full bg-gray-200 not-disabled:hover:bg-gray-100 disabled:opacity-70"
        :disabled="!canScrollLeft"
        @click="scrollLeft"
      >
        <ChevronLeftIcon
          class="size-6 text-gray-500"
        />
      </Button>
      <Button
        class="relative z-40 flex size-10 items-center justify-center rounded-full bg-gray-200 not-disabled:hover:bg-gray-100 disabled:opacity-70"
        :disabled="!canScrollRight"
        @click="scrollRight"
      >
        <ChevronRightIcon
          class="size-6 text-gray-500"
        />
      </Button>
    </div>
  </div>
</template>
