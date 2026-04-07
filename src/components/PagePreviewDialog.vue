<template>
  <v-dialog
    :model-value="modelValue"
    max-width="920"
    @update:model-value="onDialogModelValueChange"
  >
    <v-card class="rounded-xl preview-dialog-card" data-tutorial="page-preview-dialog">
      <v-card-title class="preview-dialog-title">
        <span class="text-subtitle-1 font-weight-bold">
          {{ $t('preview.pageTitle', { page }) }}
        </span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          data-tutorial="page-preview-close"
          @click="closeDialog"
        />
      </v-card-title>

      <v-card-text>
        <div class="preview-top-row mb-2">
          <div class="text-caption text-medium-emphasis">
            {{ $t('preview.firstLine') }}
          </div>

          <v-tooltip v-if="!smAndDown" :text="$t('preview.shiftTip')">
            <template #activator="{ props: tooltipProps }">
              <button
                v-bind="tooltipProps"
                type="button"
                class="preview-annotations-toggle"
                data-tutorial="page-preview-nikud"
                :title="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
                :aria-label="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
                @click="togglePreviewNikud"
              >
                <div class="preview-toggle">
                  <div class="preview-shadowed-circle">
                    <input
                      type="checkbox"
                      :checked="effectivePreviewWithNikud"
                      tabindex="-1"
                      aria-hidden="true"
                    >
                    <span class="preview-toggle-state mod-off">א</span>
                    <span class="preview-toggle-state mod-on">אֶ֨</span>
                  </div>
                </div>
              </button>
            </template>
          </v-tooltip>
          <button
            v-else
            type="button"
            class="preview-annotations-toggle"
            data-tutorial="page-preview-nikud"
            :title="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
            :aria-label="effectivePreviewWithNikud ? $t('preview.withNikud') : $t('preview.withoutNikud')"
            @click="togglePreviewNikud"
          >
            <div class="preview-toggle">
              <div class="preview-shadowed-circle">
                <input
                  type="checkbox"
                  :checked="effectivePreviewWithNikud"
                  tabindex="-1"
                  aria-hidden="true"
                >
                <span class="preview-toggle-state mod-off">א</span>
                <span class="preview-toggle-state mod-on">אֶ֨</span>
              </div>
            </div>
          </button>
        </div>

        <TikkunPreviewLine
          v-if="hasPagePreview"
          :active="modelValue"
          :columns="pagePreviewColumns"
          :is-petucha="isPetucha"
          :uses-regular-box-width="usesRegularBoxWidth"
        />
        <div v-else class="text-body-2 text-medium-emphasis">
          {{ $t('preview.lineUnavailable') }}
        </div>
      </v-card-text>

      <v-card-actions class="justify-space-between">
        <v-btn variant="text" @click="closeDialog">
          {{ $t('actions.close') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-open-in-new"
          data-tutorial="page-preview-link"
          :href="tikkunUrl ?? undefined"
          target="_blank"
          rel="noopener noreferrer"
          :disabled="!tikkunUrl"
          class="preview-open-btn"
          @click="onOpenTikkun"
        >
          {{ openTikkunLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import TikkunPreviewLine from './TikkunPreviewLine.vue';

const NUN_HAFUCHA = '׆';

const props = defineProps<{
  modelValue: boolean;
  page: number | null;
  previewColumns: string[][];
  tikkunUrl: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'open-tikkun'): void;
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();

const previewWithNikud = ref(true);
const isShiftPressed = ref(false);

const ketiv = (text: string) =>
  text
    .replace('#(פ)', '')
    .replace(`(${NUN_HAFUCHA})#`, `${NUN_HAFUCHA} `)
    .replace(`#(${NUN_HAFUCHA})`, ` ${NUN_HAFUCHA}`)
    .split(' ')
    .map((maqafSeparatedWord) =>
      maqafSeparatedWord
        .split('־')
        .map((word) => {
          const parts = word.split('#');

          if (parts.length <= 1) {
            return parts[0];
          }

          return parts.slice(1);
        })
        .join('־')
    )
    .join(' ')
    .replace(/\[/g, '{')
    .replace(/\]/g, '}');

const kri = (text: string) =>
  text
    .replace('#(פ)', '')
    .replace(`(${NUN_HAFUCHA})#`, `${NUN_HAFUCHA} `)
    .replace(`#(${NUN_HAFUCHA})`, ` ${NUN_HAFUCHA}`)
    .replace(/־/g, ' ')
    .replace(/#\[.+?\]/g, ' ')
    .replace(new RegExp(`[^א-ת\\s${NUN_HAFUCHA}]`, 'g'), '')
    .replace(/\s{2,}/g, ' ');

const textFilter = ({ text, annotated }: { text: string; annotated: boolean }) =>
  annotated ? ketiv(text) : kri(text);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const ktivKriAnnotation = (text: string) =>
  escapeHtml(text)
    .replace(/[{]/g, '<span class="ktiv-kri">')
    .replace(/[}]/g, '</span>')
    .trim();

const effectivePreviewWithNikud = computed(() =>
  isShiftPressed.value ? !previewWithNikud.value : previewWithNikud.value
);

const pagePreviewColumns = computed(() =>
  props.previewColumns.map((column) =>
    column.map((fragment) =>
      ktivKriAnnotation(
        textFilter({ text: fragment, annotated: effectivePreviewWithNikud.value })
      )
    )
  )
);

const hasPagePreview = computed(() => pagePreviewColumns.value.length > 0);
const isPetucha = computed(() =>
  props.previewColumns.some((column) =>
    column.some((fragment) => fragment.includes('#(פ)'))
  )
);
const usesRegularBoxWidth = computed(() =>
  props.previewColumns.some((column) => column.length > 1)
);
const openTikkunLabel = computed(() =>
  smAndDown.value ? t('preview.openTikkunShort') : t('preview.openTikkun')
);

const closeDialog = () => {
  emit('update:modelValue', false);
};

const togglePreviewNikud = () => {
  previewWithNikud.value = !previewWithNikud.value;
};

const onDialogModelValueChange = (value: boolean) => {
  emit('update:modelValue', value);
};

const onOpenTikkun = () => {
  if (!props.tikkunUrl) return;
  emit('open-tikkun');
};

const onPreviewKeydown = (event: KeyboardEvent) => {
  if (!props.modelValue) return;
  if (event.key !== 'Shift') return;
  isShiftPressed.value = true;
};

const onPreviewKeyup = (event: KeyboardEvent) => {
  if (!props.modelValue) return;
  if (event.key !== 'Shift') return;
  isShiftPressed.value = false;
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener('keydown', onPreviewKeydown);
      window.addEventListener('keyup', onPreviewKeyup);
      return;
    }

    window.removeEventListener('keydown', onPreviewKeydown);
    window.removeEventListener('keyup', onPreviewKeyup);
    isShiftPressed.value = false;
  },
  { immediate: true },
);

onUnmounted(() => {
  window.removeEventListener('keydown', onPreviewKeydown);
  window.removeEventListener('keyup', onPreviewKeyup);
});
</script>

<style scoped>
.preview-dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.preview-dialog-card {
  max-height: min(66vh, 520px);
  overflow: hidden;
}

.preview-dialog-card :deep(.v-card-text) {
  overflow-y: auto;
}

.preview-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-annotations-toggle {
  font-family: 'ShlomosemiStam', serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.preview-toggle {
  --annotations-toggle-active-color: white;
  --annotations-toggle-inactive-color: hsla(0, 0%, 100%, 0.6);
  text-align: middle;
  display: flex;
  align-items: center;
  direction: ltr;
  unicode-bidi: isolate;
  -webkit-user-select: none;
  user-select: none;
}

.preview-toggle [type='checkbox'] {
  display: none;
}

.preview-toggle-state {
  color: var(--annotations-toggle-inactive-color);
  transition: all 0.1s;
  position: relative;
  right: 3px;
}

.preview-toggle-state.mod-off {
  display: inline-block;
  margin-right: 0.25em;
}

.preview-toggle [type='checkbox']:checked ~ .preview-toggle-state.mod-on,
.preview-toggle [type='checkbox']:not(:checked) ~ .preview-toggle-state.mod-off {
  transform: scale(1.5);
  color: var(--annotations-toggle-active-color);
}

.preview-toggle [type='checkbox']:not(:checked) ~ .preview-toggle-state.mod-on,
.preview-toggle [type='checkbox']:not(:checked) ~ .preview-toggle-state.mod-off {
  right: -3px;
}

.preview-shadowed-circle {
  padding: 0.72em;
  height: 2.95em;
  width: 2.95em;
  display: flex;
  direction: ltr;
  unicode-bidi: isolate;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: black;
  color: white;
  transition: 0.15s transform;
}

.preview-shadowed-circle:hover {
  transform: scale(1.08);
}

.preview-open-btn {
  max-width: 100%;
  min-width: 0;
}

.preview-open-btn :deep(.v-btn__content) {
  white-space: normal;
  line-height: 1.15;
  text-align: center;
}
</style>
