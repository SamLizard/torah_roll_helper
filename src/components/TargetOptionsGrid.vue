<template>
  <transition name="dialog-bottom-transition">
    <div 
      v-if="open" 
      class="target-overlay bg-background"
      data-tutorial="target-overlay"
    >
      <v-card class="h-100 d-flex flex-column" rounded="0" elevation="0">
        
        <v-toolbar color="surface" elevation="1" density="compact">
          <v-btn icon @click="close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title class="target-toolbar-title text-subtitle-1 font-weight-bold">
            {{ $t('targets.title') }}
          </v-toolbar-title>

          <div class="search-container" data-tutorial="target-search">
            <v-text-field
              v-model="filter"
              :placeholder="$t('actions.search')"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              single-line
              rounded="lg"
            />
          </div>
        </v-toolbar>

        <v-card-text class="pa-4 flex-grow-1 overflow-y-auto">
          <div v-if="isFullList" class="d-flex align-center justify-space-between mb-6">
            <div class="text-subtitle-1 font-weight-medium">
              {{ $t('targets.showingAll') }} 
              <span class="text-medium-emphasis">({{ pagedOptions.length }})</span>
            </div>
          </div>

          <div v-if="pagedOptions.length === 0" class="text-center mt-12 text-medium-emphasis">
            {{ $t('noResults') }}
          </div>

          <template v-else>
            <div v-for="section in groupedSections" :key="section.type" class="mb-8">
              
              <div 
                class="d-flex align-center mb-3 cursor-pointer user-select-none" 
                @click="toggleSection(section.type)"
                v-ripple
                style="width: fit-content; border-radius: 8px; padding: 4px 8px; margin-left: -8px;"
              >
                <v-icon 
                  class="me-2 transition-transform" 
                  :class="{ 'rotate-minus-90': sectionCollapsed[section.type] }"
                  color="primary"
                >
                  mdi-chevron-down
                </v-icon>
                
                <v-icon color="primary" class="me-2" size="small">mdi-bookmark-outline</v-icon>
                <h3 class="text-h6 font-weight-bold mb-0">
                  {{ $t(`type.${section.type}`) }}
                  <span class="text-body-2 text-medium-emphasis ms-2">({{ section.count }})</span>
                </h3>
              </div>

              <v-expand-transition>
                <div v-show="!sectionCollapsed[section.type]">
                  
                  <v-expansion-panels 
                    v-if="section.groups.length > 0" 
                    :model-value="getOpenGroups(section.type)"
                    @update:model-value="(value) => setOpenGroups(section.type, value)"
                    variant="accordion" 
                    class="mb-4 rounded-lg border" 
                    flat
                    multiple
                  >
                    <v-expansion-panel
                      v-for="group in section.groups"
                      :key="group.key"
                      :value="group.key"
                      elevation="0"
                      bg-color="surface"
                    >
                      <v-expansion-panel-title class="font-weight-medium">
                        <span>
                          {{ $t(`group.${group.key}`) }}
                          <span class="text-caption text-medium-emphasis ms-2">({{ group.items.length }})</span>
                        </span>
                        <template #actions="{ expanded }">
                          <v-icon :icon="expanded ? 'mdi-folder-open-outline' : 'mdi-folder-outline'" />
                        </template>
                      </v-expansion-panel-title>
                      
                      <v-expansion-panel-text>
                        <div class="options-grid pt-2">
                          <ReadingOptionCard
                            v-for="item in group.items"
                            :key="item.key"
                            :ref="(el) => setCardRef(item.key, el)"
                            :reading-key="item.key"
                            :page="item.ref.page"
                            :specific-badge="getTargetBadgeKind(item)"
                            :highlight-next-parasha="isNextParasha(item)"
                            :roll-preview="getRollPreview(item.ref.page)"
                            @click="select(item)"
                          />
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>

                  <div v-if="section.singles.length > 0" class="options-grid">
                    <ReadingOptionCard
                      v-for="item in section.singles"
                      :key="item.key"
                      :ref="(el) => setCardRef(item.key, el)"
                      :reading-key="item.key"
                      :page="item.ref.page"
                      :specific-badge="getTargetBadgeKind(item)"
                      :highlight-next-parasha="isNextParasha(item)"
                      :roll-preview="getRollPreview(item.ref.page)"
                      @click="select(item)"
                    />
                  </div>

                </div>
              </v-expand-transition>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, type ComponentPublicInstance } from 'vue';
import { storeToRefs } from 'pinia';
import { useOptionsStore } from '@/stores/options';
import { useMonthlyReadingsStore } from '@/stores/monthlyReadings';
import { computeRoll } from '@/composables/utils';
import { splitPairedParashaReadingId } from '@/composables/calendar/calendar';
import {
  findReadingTargetByKey,
  getTargetBadgeKind,
  getVisibleReadingTargets,
  type ReadingTarget,
} from '@/composables/readingTargets';
import { useI18n } from 'vue-i18n';
import { useRtl } from 'vuetify';
import ReadingOptionCard from './ReadingOptionCard.vue';
const { t } = useI18n();
const { isRtl } = useRtl();

type TargetItem = ReadingTarget;
type SectionType = TargetItem['type'];

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  side: { type: String as () => 'from' | 'to', default: 'to' },
  allowGola: { type: Boolean, default: false },
  selectedTargetKey: { type: String, default: null },
  initialOpenGroup: { type: String, default: null },
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'select', item: TargetItem): void;
}>();

const store = useOptionsStore();
const monthlyReadingsStore = useMonthlyReadingsStore();
const { monthlyReadings } = storeToRefs(monthlyReadingsStore);
const filter = ref('');
const isFullList = ref(true); 

const sectionCollapsed = ref<Record<string, boolean>>({});
const openGroupsByType = ref<Record<SectionType, string[]>>({
  parasha: [],
  holyday: [],
});
const cardRefs = ref<Record<string, HTMLElement>>({});
const hasAutoFocusedNextParasha = ref(false);
const visibleTargets = computed(() => getVisibleReadingTargets(store.isInGola) as TargetItem[]);

const isSectionType = (type: string): type is SectionType => type === 'parasha' || type === 'holyday';

const findVisibleTargetByKey = (key: string) => {
  return findReadingTargetByKey(key, store.isInGola) as TargetItem | null;
};

const setCardRef = (
  key: string,
  el: Element | ComponentPublicInstance | null
) => {
  if (!el) {
    delete cardRefs.value[key];
    return;
  }

  if (el instanceof Element) {
    if (el instanceof HTMLElement) {
      cardRefs.value[key] = el;
    }
    return;
  }

  const rootElement = (el as ComponentPublicInstance).$el;
  if (rootElement instanceof HTMLElement) {
    cardRefs.value[key] = rootElement;
  }
};

const nextParashaKey = computed(() => {
  const nextReadings = monthlyReadings.value.nextMonth;

  for (const reading of nextReadings) {
    const pairedParashaIds = splitPairedParashaReadingId(reading.readingId);
    const readingKey = pairedParashaIds ? pairedParashaIds[0] : reading.readingId;
    const target = findVisibleTargetByKey(readingKey);
    if (!target) continue;
    if (target.type === 'parasha') return target.key;
  }

  return null;
});

const isNextParasha = (item: TargetItem) => item.key === nextParashaKey.value;

const getPreferredFocusTargetKey = () => {
  if (props.selectedTargetKey && filtered.value.some((target) => target.key === props.selectedTargetKey)) {
    return props.selectedTargetKey;
  }

  return nextParashaKey.value;
};

const revealFocusGroup = () => {
  const targetKey = getPreferredFocusTargetKey();
  if (!targetKey) return;

  const focusTarget = findVisibleTargetByKey(targetKey);
  if (!focusTarget) return;

  sectionCollapsed.value[focusTarget.type] = false;
  if (focusTarget.group && !openGroupsByType.value[focusTarget.type].includes(focusTarget.group)) {
    openGroupsByType.value = {
      ...openGroupsByType.value,
      [focusTarget.type]: [...openGroupsByType.value[focusTarget.type], focusTarget.group],
    };
  }
};

const focusPreferredTarget = () => {
  const targetKey = getPreferredFocusTargetKey();
  if (!targetKey) return;

  const focusCard = cardRefs.value[targetKey];
  if (!focusCard) return;

  focusCard.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
  hasAutoFocusedNextParasha.value = true;
};

const normalizeGroupValues = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value == null) return [];
  return [String(value)];
};

const getOpenGroups = (type: string) => {
  if (!isSectionType(type)) return [];
  return openGroupsByType.value[type];
};

const setOpenGroups = (type: string, value: unknown) => {
  if (!isSectionType(type)) return;
  openGroupsByType.value = {
    ...openGroupsByType.value,
    [type]: normalizeGroupValues(value),
  };
};

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
});

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) {
    close();
  }
};

watch(open, (isOpen) => {
  if (isOpen) {
    filter.value = '';
    hasAutoFocusedNextParasha.value = false;
    revealFocusGroup();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeydown);
  } else {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onKeydown);
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onKeydown);
});

watch(() => props.initialOpenGroup, (newVal) => {
  if (newVal) {
    if (!openGroupsByType.value.parasha.includes(newVal)) {
      openGroupsByType.value.parasha = [...openGroupsByType.value.parasha, newVal];
    }
    if (!openGroupsByType.value.holyday.includes(newVal)) {
      openGroupsByType.value.holyday = [...openGroupsByType.value.holyday, newVal];
    }
  }
}, { immediate: true });

const toggleSection = (type: string) => {
  sectionCollapsed.value[type] = !sectionCollapsed.value[type];
};

const filtered = computed(() => {  
  const q = filter.value?.trim()?.toLowerCase();
  const list = visibleTargets.value;
  
  return list.filter((target) => {
    if (!q) return true;
    const searchStr = `${target.key} ${target.type} ${target.ref.page} ${t(`readingTargets.${target.key}`)}`.toLowerCase();
    return searchStr.includes(q);
  });
});

const pagedOptions = computed(() => filtered.value);

const groupedSections = computed(() => {
  const buckets: Record<string, { groups: Record<string, TargetItem[]>, singles: TargetItem[] }> = {
    parasha: { groups: {}, singles: [] },
    holyday: { groups: {}, singles: [] }
  };

  filtered.value.forEach(item => {
    const typeKey = (item.type === 'parasha') ? 'parasha' : 'holyday';
    
    if (item.group) {
      if (!buckets[typeKey].groups[item.group]) {
        buckets[typeKey].groups[item.group] = [];
      }
      buckets[typeKey].groups[item.group].push(item);
    } else {
      buckets[typeKey].singles.push(item);
    }
  });

  const result = [];
  
  for (const type of ['parasha', 'holyday']) {
    const data = buckets[type];
    const finalGroups: { key: string, items: TargetItem[] }[] = [];
    const finalSingles = [...data.singles];

    Object.entries(data.groups).forEach(([groupKey, items]) => {
      if (items.length > 1) {
        finalGroups.push({ key: groupKey, items });
      } else {
        finalSingles.push(...items);
      }
    });

    const totalCount = finalSingles.length + finalGroups.reduce((sum, g) => sum + g.items.length, 0);

    if (totalCount > 0) {
      result.push({
        type,
        groups: finalGroups,
        singles: finalSingles,
        count: totalCount
      });
    }
  }

  return result;
});

watch(
  () => [open.value, props.selectedTargetKey, nextParashaKey.value, groupedSections.value.length, filter.value],
  () => {
    if (!open.value || hasAutoFocusedNextParasha.value) return;
    if (filter.value.trim().length > 0) return;

    focusPreferredTarget();
  },
  { flush: 'post' }
);

const select = (item: TargetItem) => {  
  filter.value = '';
  
  emit('select', item);
  open.value = false;
};

const close = () => {
  open.value = false;
};

const getRollPreview = (targetPage: number) => {
  const fromPage = store.fromPage;

  if (props.side !== 'to' || fromPage === null || fromPage === targetPage) {
    return null;
  }

  const result = computeRoll(fromPage, targetPage);
  if (!result) return null;

  const isForward = result.rollDirection === 'forward';
  
  let iconName = '';
  if (isRtl.value) {
    iconName = isForward ? 'mdi-arrow-left' : 'mdi-arrow-right';
  } else {
    iconName = isForward ? 'mdi-arrow-right' : 'mdi-arrow-left';
  }

  return {
    icon: iconName,
    color: isForward ? 'primary' : 'secondary',
    text: t('preview.cols', { count: result.pages })
  };
};
</script>

<style scoped>
.target-overlay {
  position: fixed;
  inset: 0;
  z-index: 950;
  padding-top: 64px;
  display: flex;
  flex-direction: column;
}

.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.dialog-bottom-transition-enter-from,
.dialog-bottom-transition-leave-to {
  transform: translateY(100%);
}

.gap-1 {
  gap: 4px;
}

.search-container {
  width: 300px;
  min-width: 140px;
  flex: 0 1 300px;
  margin-inline-start: 8px;
  margin-inline-end: 16px;
}

.target-toolbar-title {
  min-width: 0;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .search-container {
    width: 140px;
    min-width: 100px;
    flex-basis: 140px;
    margin-inline-end: 8px;
  }
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding-bottom: 24px;
}

:deep(.v-expansion-panel) {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}
:deep(.v-expansion-panel:last-child) {
  border-bottom: none !important;
}

.rotate-minus-90 {
  transform: rotate(-90deg);
}
.transition-transform {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
