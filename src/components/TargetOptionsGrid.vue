<template>
  <!-- DONE 7.5: Change it so the navbar is always accessible. Maybe add a navbar instance? Or change from v-dialog to regular page? -->
  <transition name="dialog-bottom-transition">
    <div 
      v-if="open" 
      class="target-overlay bg-background"
    >
      <v-card class="h-100 d-flex flex-column" rounded="0" elevation="0">
        
        <v-toolbar color="surface" elevation="1" density="compact">
          <v-btn icon @click="close">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title class="target-toolbar-title text-subtitle-1 font-weight-bold">
            {{ $t('targets.title') }}
          </v-toolbar-title>

          <div class="search-container">
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
            
            <!-- DONE 7.6: maybe put it directly in the navbar? Wait to have a special part for the user details/settings? -->
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
                          <div
                            v-for="item in group.items"
                            :key="item.key"
                            :ref="(el) => setCardRef(item.key, el)"
                            class="option-card"
                            :class="{ 'gola-card': item.gola, 'next-parasha-card': isNextParasha(item) }"
                            @click="select(item)"
                            v-ripple
                          >
                            <!-- DONE: change it to have only a key, and take the i18n value. Stay with a fallback. -->
                            <!-- The key is readingTargets.id (so in en.json, there is readingTargets.bereshit...) -->
                            <div v-if="item.gola" class="gola-badge">
                              <v-icon size="10" color="primary" class="me-1">mdi-earth</v-icon>
                              <span>{{ $t('targets.golaBadge') }}</span>
                            </div>

                            <div v-if="isNextParasha(item)" class="next-parasha-badge">
                              <v-icon size="11" color="primary">mdi-book-marker</v-icon>
                            </div>

                            <div class="d-flex justify-space-between align-start mb-2">
                              <span class="option-name text-truncate">
                                {{ $t(`readingTargets.${item.key}`) }}
                              </span>
                            </div>
                            
                            <!-- DONE 5: display a roll preview for the TO (and FROM is filled)? When hover? -->
                            <!-- DONE 7: add special display for the only gola readings. -->
                            <div class="d-flex align-center text-caption text-medium-emphasis justify-space-between">
                              <span>{{ $t('page') }} {{ item.ref.page }}</span>

                              <div 
                                v-if="getRollPreview(item.ref.page)" 
                                :class="`text-${getRollPreview(item.ref.page)?.color} d-flex align-center gap-1`"
                              >
                                <v-icon size="x-small">
                                  {{ getRollPreview(item.ref.page)?.icon }}
                                </v-icon>
                                
                                <span class="font-weight-bold mx-1">
                                  {{ getRollPreview(item.ref.page)?.text }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>

                  <div v-if="section.singles.length > 0" class="options-grid">
                    <div
                      v-for="item in section.singles"
                      :key="item.key"
                      :ref="(el) => setCardRef(item.key, el)"
                      class="option-card"
                      :class="{ 'gola-card': item.gola, 'next-parasha-card': isNextParasha(item) }"
                      @click="select(item)"
                      v-ripple
                    >
                      <div v-if="item.gola" class="gola-badge">
                        <v-icon size="10" color="primary" class="me-1">mdi-earth</v-icon>
                        <span>{{ $t('targets.golaBadge') }}</span>
                      </div>

                      <div v-if="isNextParasha(item)" class="next-parasha-badge">
                        <v-icon size="11" color="primary">mdi-book-marker</v-icon>
                      </div>

                      <div class="d-flex justify-space-between align-start mb-2">
                        <span class="option-name text-truncate">
                          {{ $t(`readingTargets.${item.key}`) }}
                        </span>
                      </div>
                      
                      <div class="d-flex align-center text-caption text-medium-emphasis justify-space-between">
                        <span>{{ $t('page') }} {{ item.ref.page }}</span>

                        <div v-if="getRollPreview(item.ref.page)" :class="`text-${getRollPreview(item.ref.page)?.color}`">
                          <v-icon size="x-small" class="me-1">
                            {{ getRollPreview(item.ref.page)?.icon }}
                          </v-icon>
                          <span class="font-weight-bold">
                            {{ getRollPreview(item.ref.page)?.text }}
                          </span>
                        </div>
                      </div>
                    </div>
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
import targetsData from '@/data/target_pages.json';
import { computeRoll } from '@/composables/utils'; // Import computeRoll
import type { TorahRef } from '@/types';
import { useI18n } from 'vue-i18n';
import { useRtl } from 'vuetify';
const { t } = useI18n();
const { isRtl } = useRtl();

interface TargetItem {
  key: string;
  group: string;
  gola: boolean;
  type: 'parasha' | 'holyday';
  ref: TorahRef;
  refEndPartial?: TorahRef;
  refEnd: TorahRef;
}
type SectionType = TargetItem['type'];

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  side: { type: String as () => 'from' | 'to', default: 'to' },
  allowGola: { type: Boolean, default: false },
  selectedTargetKey: { type: String, default: null },
  // Future DONE 8.5: Pass the group key here (e.g. 'genesis') to auto-open it
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

// Tracks which Outer Sections (Types) are collapsed.
// Default: empty object means all are expanded (false).
const sectionCollapsed = ref<Record<string, boolean>>({});

// Tracks which Inner Groups (Accordion) are open. 
// Bound to v-model of v-expansion-panels.
const openGroupsByType = ref<Record<SectionType, string[]>>({
  parasha: [],
  holyday: [],
});
const cardRefs = ref<Record<string, HTMLElement>>({});
const targetsByKey = new Map((targetsData as TargetItem[]).map((target) => [target.key, target]));
const hasAutoFocusedNextParasha = ref(false);

const isSectionType = (type: string): type is SectionType => type === 'parasha' || type === 'holyday';

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
    const target = targetsByKey.get(reading.readingId);
    if (!target) continue;
    if (target.gola && !store.isInGola) continue;
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

  const focusTarget = targetsByKey.get(targetKey);
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

// --- Watchers ---

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
});

// Handle ESC key to close
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) {
    close();
  }
};

// Toggle body scroll when opened/closed
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

// Watch for the prop to set initial open group (For DONE 8.5)
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

// --- Logic ---

const toggleSection = (type: string) => {
  sectionCollapsed.value[type] = !sectionCollapsed.value[type];
};

const filtered = computed(() => {  
  const q = filter.value?.trim()?.toLowerCase();
  const list = targetsData as TargetItem[];
  
  return list.filter((target) => {
    // Exclude gola-only items when the store says we're not in Gola
    if (target.gola && !store.isInGola) return false;

    // If no query, include the item (already passed gola check)
    if (!q) return true;

    // Search matches: key, type, page, or translated name
    const searchStr = `${target.key} ${target.type} ${target.ref.page} ${t(`readingTargets.${target.key}`)}`.toLowerCase();
    return searchStr.includes(q);
  });
});

const pagedOptions = computed(() => filtered.value);

// 2. Grouping Logic
const groupedSections = computed(() => {
  // Buckets for types
  const buckets: Record<string, { groups: Record<string, TargetItem[]>, singles: TargetItem[] }> = {
    parasha: { groups: {}, singles: [] },
    holyday: { groups: {}, singles: [] }
  };

  // Step A: Distribute items into buckets
  filtered.value.forEach(item => {
    // Determine type bucket (fallback to 'holyday' if unknown type appears, or skip)
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

  // Step B: Transform to array structure and handle "Single Item Groups"
  // Order: Parasha first, then Holyday (or strict array order)
  const result = [];
  
  for (const type of ['parasha', 'holyday']) {
    const data = buckets[type];
    const finalGroups: { key: string, items: TargetItem[] }[] = [];
    const finalSingles = [...data.singles];

    // Process groups: if > 1 item, keep as group. Else, move to singles.
    Object.entries(data.groups).forEach(([groupKey, items]) => {
      if (items.length > 1) {
        finalGroups.push({ key: groupKey, items });
      } else {
        finalSingles.push(...items);
      }
    });

    // Calculate total count for this Type section
    const totalCount = finalSingles.length + finalGroups.reduce((sum, g) => sum + g.items.length, 0);

    // Only add section if it has content
    if (totalCount > 0) {
      result.push({
        type,
        groups: finalGroups, // You might want to sort these keys if needed
        singles: finalSingles,
        count: totalCount // <--- Added this line
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

// Logic for DONE 5
const getRollPreview = (targetPage: number) => {
  // Only show preview if we are selecting 'TO' and we have a 'FROM' page
  const fromPage = store.fromPage;

  if (props.side !== 'to' || fromPage === null || fromPage === targetPage) {
    return null;
  }

  // Calculate logic
  const result = computeRoll(fromPage, targetPage);
  if (!result) return null;

  const isForward = result.rollDirection === 'forward';
  
  // RTL Logic for Icon Direction
  // In LTR: Forward = Right Arrow, Backward = Left Arrow
  // In RTL (Hebrew): Forward (Next Columns) = Left Arrow, Backward = Right Arrow
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
/* FULL SCREEN OVERLAY
  - Fixed position
  - z-index: 950 (Below NavBar which is usually >1000)
  - padding-top: 64px (To prevent content from hiding behind NavBar)
*/
.target-overlay {
  position: fixed;
  inset: 0; /* top:0, right:0, bottom:0, left:0 */
  z-index: 950;
  
  /* Safe area for navbar - usually 56px-64px depending on density */
  padding-top: 64px; 
  
  display: flex;
  flex-direction: column;
}

/* ANIMATION 
  Replicating the dialog-bottom-transition 
*/
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

/* Modern CSS Grid:
   Creates columns that are at least 180px wide.
   Fills the row automatically. No media queries needed.
*/
.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding-bottom: 24px;
}

.option-card {
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.option-card:hover { 
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
  border-color: rgb(var(--v-theme-primary));
}

.next-parasha-card {
  border-color: rgba(var(--v-theme-primary), 0.55);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.2);
}

.next-parasha-badge {
  position: absolute;
  top: 8px;
  inset-inline-start: 8px;
  width: 20px;
  height: 20px;
  background-color: rgba(var(--v-theme-surface), 0.92);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.next-parasha-card .option-name {
  padding-inline-start: 20px;
}

/* Styles for Gola items */
.gola-card {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background-color: rgba(var(--v-theme-primary), 0.03); /* Very light tint */
}

.gola-badge {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px; /* Use logical CSS if preferred: inset-inline-end: 8px */
  background-color: rgba(var(--v-theme-surface), 0.9);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  text-transform: uppercase;
  display: flex;
  align-items: center;
}

.option-name { 
  font-weight: 600; 
  font-size: 1rem;
  line-height: 1.2;
  /* Ensure text doesn't overlap the badge if name is long */
  padding-inline-end: 20px;
}

/* .targets-dialog :deep(.v-overlay__content) {
  top: var(--v-layout-top, 64px);
  height: calc(100% - var(--v-layout-top, 64px));
  max-height: none;
} */

/* Specific style to make expansion panels blend better */
:deep(.v-expansion-panel) {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}
:deep(.v-expansion-panel:last-child) {
  border-bottom: none !important;
}

/* Animations for chevron */
.rotate-minus-90 {
  transform: rotate(-90deg);
}
.transition-transform {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
