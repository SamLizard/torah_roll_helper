<template>
  <div
    ref="previewFitAreaRef"
    class="tikkun-preview-fit-area"
    dir="rtl"
    lang="he"
  >
    <div
      class="tikkun-preview-line-shell"
      :style="previewLineShellStyle"
    >
      <div class="tikkun-preview-line">
        <div
          ref="previewLineContentRef"
          class="tikkun-preview-line-content"
          :class="{ 'mod-petucha': isPetucha }"
          :style="previewLineContentStyle"
        >
          <div
            v-for="(column, columnIndex) in columns"
            :key="`visible-${columnIndex}`"
            class="preview-column"
          >
            <span
              v-for="(fragment, fragmentIndex) in column"
              :key="`visible-${columnIndex}-${fragmentIndex}`"
              class="tikkun-preview-fragment"
              :class="{ 'mod-setuma': column.length > 1 }"
              v-html="fragment"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="tikkun-preview-measure" aria-hidden="true">
      <div
        ref="previewMeasureShellRef"
        class="tikkun-preview-line-shell mod-measure"
      >
        <div class="tikkun-preview-line">
          <div
            ref="previewMeasureContentRef"
            class="tikkun-preview-line-content mod-measure"
            :class="{ 'mod-petucha': isPetucha }"
            :style="previewMeasureContentStyle"
          >
            <div
              v-for="(column, columnIndex) in columns"
              :key="`measure-${columnIndex}`"
              class="preview-column"
            >
              <span
                v-for="(fragment, fragmentIndex) in column"
                :key="`measure-${columnIndex}-${fragmentIndex}`"
                class="tikkun-preview-fragment"
                :class="{ 'mod-setuma': column.length > 1 }"
                v-html="fragment"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue';

const BASE_PREVIEW_FONT_PX = 24;
const PETUCHA_DESKTOP_BOX_WIDTH_PX = 31 * 16;
const FIT_SAFETY_MARGIN_PX = 10;
const PREVIEW_DIMENSION_EPSILON_PX = 0.5;
const MIN_PREVIEW_FONT_SCALE = 0.32;
const PREVIEW_OPEN_FIT_DELAYS_MS = [120, 260];

const props = withDefaults(defineProps<{
  active?: boolean;
  columns: string[][];
  isPetucha?: boolean;
}>(), {
  active: false,
  isPetucha: false,
});

const previewFitAreaRef = ref<HTMLElement | null>(null);
const previewLineContentRef = ref<HTMLElement | null>(null);
const previewMeasureShellRef = ref<HTMLElement | null>(null);
const previewMeasureContentRef = ref<HTMLElement | null>(null);
const previewBaseFontPx = ref(BASE_PREVIEW_FONT_PX);
const previewBoxWidthPx = ref<number | null>(null);
const previewFontScale = ref(1);
const previewIsReady = ref(false);

let previewResizeObserver: ResizeObserver | null = null;
let previewFitFrameId: number | null = null;
let previewOpenFitTimeoutIds: number[] = [];
let lastObservedFitAreaWidth = 0;
let previewFitRequestId = 0;
let previewAwaitingFinalReveal = false;

const previewLineShellStyle = computed<CSSProperties>(() => ({
  width: previewBoxWidthPx.value === null ? undefined : `${previewBoxWidthPx.value}px`,
  visibility: previewIsReady.value ? 'visible' : 'hidden',
}));

const previewLineContentStyle = computed(() => ({
  fontSize: `${previewBaseFontPx.value * previewFontScale.value}px`,
}));

const previewMeasureContentStyle = computed(() => ({
  fontSize: `${previewBaseFontPx.value}px`,
}));

const cancelScheduledPreviewFit = () => {
  if (previewFitFrameId === null) return;

  window.cancelAnimationFrame(previewFitFrameId);
  previewFitFrameId = null;
};

const resetPreviewFit = () => {
  previewBoxWidthPx.value = null;
  previewFontScale.value = 1;
  previewIsReady.value = false;
  previewAwaitingFinalReveal = false;
};

const assignPreviewFitIfChanged = ({
  boxWidthPx,
  fontScale,
}: {
  boxWidthPx: number | null;
  fontScale: number;
}) => {
  const currentBoxWidthPx = previewBoxWidthPx.value;
  const nextBoxWidthPx = boxWidthPx === null ? null : Math.max(0, boxWidthPx);
  const boxWidthChanged = currentBoxWidthPx === null || nextBoxWidthPx === null
    ? currentBoxWidthPx !== nextBoxWidthPx
    : Math.abs(currentBoxWidthPx - nextBoxWidthPx) > PREVIEW_DIMENSION_EPSILON_PX;

  const nextFontScale = Math.min(1, Math.max(MIN_PREVIEW_FONT_SCALE, fontScale));
  const fontScaleChanged = Math.abs(previewFontScale.value - nextFontScale) > 0.001;

  if (boxWidthChanged) {
    previewBoxWidthPx.value = nextBoxWidthPx;
  }

  if (fontScaleChanged) {
    previewFontScale.value = nextFontScale;
  }
};

const getPreviewBaseFontPx = (availableWidth: number) => {
  if (availableWidth <= 600) return BASE_PREVIEW_FONT_PX * 0.6;
  if (availableWidth <= 700) return BASE_PREVIEW_FONT_PX * 0.7;
  if (availableWidth <= 800) return BASE_PREVIEW_FONT_PX * 0.8;
  if (availableWidth <= 900) return BASE_PREVIEW_FONT_PX * 0.9;
  return BASE_PREVIEW_FONT_PX;
};

const waitForAnimationFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });

const waitForPreviewFont = async () => {
  if (!('fonts' in document)) return;

  try {
    await Promise.all([
      document.fonts.load('16px "ShlomosemiStam"'),
      document.fonts.ready,
    ]);
  } catch {
    // Keep the current metrics if the font API is unavailable.
  }
};

const getTargetPreviewBoxWidth = ({
  availableWidth,
  naturalBoxWidth,
  isPetucha,
}: {
  availableWidth: number;
  naturalBoxWidth: number;
  isPetucha: boolean;
}) =>
  Math.min(
    availableWidth,
    isPetucha
      ? Math.max(PETUCHA_DESKTOP_BOX_WIDTH_PX, naturalBoxWidth)
      : naturalBoxWidth,
  );

const updatePreviewFit = async ({
  requestId,
  revealWhenDone,
}: {
  requestId: number;
  revealWhenDone: boolean;
}) => {
  if (!props.active) {
    resetPreviewFit();
    return;
  }

  const fitArea = previewFitAreaRef.value;
  const measureShell = previewMeasureShellRef.value;
  const measureContent = previewMeasureContentRef.value;
  if (!fitArea || !measureShell || !measureContent) return;

  await nextTick();
  await waitForPreviewFont();
  await waitForAnimationFrame();

  if (requestId !== previewFitRequestId) return;

  const availableWidth = fitArea.clientWidth;
  if (availableWidth <= 0) {
    if (revealWhenDone) {
      previewIsReady.value = true;
    }
    return;
  }

  previewBaseFontPx.value = getPreviewBaseFontPx(availableWidth);
  await nextTick();
  await waitForAnimationFrame();

  if (requestId !== previewFitRequestId) return;

  const naturalBoxWidth = measureShell.getBoundingClientRect().width;
  const targetBoxWidth = getTargetPreviewBoxWidth({
    availableWidth,
    naturalBoxWidth,
    isPetucha: props.isPetucha,
  });

  previewBoxWidthPx.value = targetBoxWidth;
  await nextTick();
  await waitForAnimationFrame();

  if (requestId !== previewFitRequestId) return;

  const visibleContent = previewLineContentRef.value;
  if (!visibleContent) return;

  const availableContentWidth = Math.max(
    0,
    visibleContent.clientWidth - FIT_SAFETY_MARGIN_PX,
  );
  const naturalContentWidth = measureContent.getBoundingClientRect().width;

  if (availableContentWidth <= 0 || naturalContentWidth <= 0) {
    assignPreviewFitIfChanged({
      boxWidthPx: targetBoxWidth,
      fontScale: 1,
    });
    if (revealWhenDone) {
      await nextTick();
      if (requestId === previewFitRequestId) {
        previewIsReady.value = true;
      }
    }
    return;
  }

  assignPreviewFitIfChanged({
    boxWidthPx: targetBoxWidth,
    fontScale: availableContentWidth / naturalContentWidth,
  });
  if (revealWhenDone) {
    await nextTick();
    if (requestId === previewFitRequestId) {
      previewIsReady.value = true;
    }
  }
};

const schedulePreviewFit = ({ revealWhenDone }: { revealWhenDone: boolean }) => {
  cancelScheduledPreviewFit();
  const requestId = ++previewFitRequestId;
  previewIsReady.value = false;
  previewFitFrameId = window.requestAnimationFrame(() => {
    previewFitFrameId = null;
    void updatePreviewFit({ requestId, revealWhenDone });
  });
};

const clearScheduledOpenFits = () => {
  for (const timeoutId of previewOpenFitTimeoutIds) {
    window.clearTimeout(timeoutId);
  }

  previewOpenFitTimeoutIds = [];
};

const schedulePreviewFitAfterOpen = () => {
  clearScheduledOpenFits();
  previewAwaitingFinalReveal = true;

  PREVIEW_OPEN_FIT_DELAYS_MS.forEach((delayMs, index) => {
    const timeoutId = window.setTimeout(() => {
      const isFinalOpenFit = index === PREVIEW_OPEN_FIT_DELAYS_MS.length - 1;
      if (isFinalOpenFit) {
        previewAwaitingFinalReveal = false;
      }

      schedulePreviewFit({
        revealWhenDone: isFinalOpenFit,
      });
    }, delayMs);

    previewOpenFitTimeoutIds.push(timeoutId);
  });
};

const syncPreviewResizeObserver = () => {
  previewResizeObserver?.disconnect();

  const fitArea = previewFitAreaRef.value;
  if (!fitArea) return;

  lastObservedFitAreaWidth = fitArea.getBoundingClientRect().width;

  previewResizeObserver ??= new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;

    const nextWidth = entry.contentRect.width;
    if (Math.abs(nextWidth - lastObservedFitAreaWidth) <= PREVIEW_DIMENSION_EPSILON_PX) {
      return;
    }

    lastObservedFitAreaWidth = nextWidth;
    schedulePreviewFit({ revealWhenDone: !previewAwaitingFinalReveal });
  });

  previewResizeObserver.observe(fitArea);
};

onMounted(() => {
  syncPreviewResizeObserver();
});

watch(
  () => props.active,
  (active) => {
    if (!active) {
      clearScheduledOpenFits();
      resetPreviewFit();
      return;
    }

    schedulePreviewFit({ revealWhenDone: false });
    schedulePreviewFitAfterOpen();
  },
  { immediate: true },
);

watch(
  () => [props.columns, props.isPetucha],
  async () => {
    if (!props.active) return;

    await nextTick();
    schedulePreviewFit({ revealWhenDone: !previewAwaitingFinalReveal });
  },
  { deep: true },
);

onUnmounted(() => {
  previewResizeObserver?.disconnect();
  cancelScheduledPreviewFit();
  clearScheduledOpenFits();
});
</script>

<style scoped>
.tikkun-preview-fit-area {
  width: 100%;
}

.tikkun-preview-line-shell {
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
}

.tikkun-preview-line-shell.mod-measure {
  position: absolute;
  inset-inline-start: -9999px;
  top: 0;
  width: max-content !important;
  max-width: none;
  visibility: hidden;
  pointer-events: none;
}

.tikkun-preview-line {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background-color: rgba(var(--v-theme-surface-variant), 0.18);
  padding: 8px 8px 6px;
}

.tikkun-preview-line-content {
  direction: rtl;
  unicode-bidi: isolate;
  text-align: justify;
  line-height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-family: 'ShlomosemiStam', serif;
}

.tikkun-preview-line-content.mod-petucha {
  text-align: start;
}

.tikkun-preview-line-content.mod-measure {
  width: max-content;
}

.preview-column {
  flex: 1;
  display: flex;
  justify-content: space-between;
  direction: rtl;
  min-width: 18ch;
}

.preview-column:nth-child(2) {
  margin-right: 5em;
  width: 12em;
}

.tikkun-preview-fragment {
  width: 100%;
  white-space: nowrap;
}

.tikkun-preview-fragment.mod-setuma {
  width: auto;
}

.tikkun-preview-fragment::after {
  content: '';
  width: 100%;
  display: inline-block;
}

.tikkun-preview-line-content :deep(.ktiv-kri) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 8px;
  padding: 0.1rem;
}

@media (max-width: 600px) {
  .preview-column {
    min-width: 18ch;
  }
}
</style>
