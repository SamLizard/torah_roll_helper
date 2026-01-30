<template>
  <!-- TODO 7.5: Change it so the navbar is always accessible. Maybe add a navbar instance? Or change from v-dialog to regular page? -->
  <v-dialog 
    v-model="open" 
    fullscreen 
    transition="dialog-bottom-transition"
    scrollable
  >
    <v-card class="bg-background">
      <v-toolbar color="surface" elevation="1">
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>{{ $t('targets.title') }}</v-toolbar-title>
        
        <v-spacer />
        
        <div class="search-container me-4">
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

      <v-card-text class="pa-4">
        <div v-if="isFullList" class="d-flex align-center justify-space-between mb-6">
          <div class="text-subtitle-1 font-weight-medium">
            {{ $t('targets.showingAll') }} 
            <span class="text-medium-emphasis">({{ pagedOptions.length }})</span>
          </div>
          
          <div v-if="allowGola" class="d-flex align-center bg-surface px-4 rounded-lg border">
            <v-switch
              v-model="localIsInGola"
              :label="$t('targets.golaLabel')"
              color="primary"
              hide-details
              density="compact"
              inset
            />
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
                  v-model="openGroups" 
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
                          class="option-card"
                          @click="select(item)"
                          v-ripple
                        >
                      <!-- DONE: change it to have only a key, and take the i18n value. Stay with a fallback. -->
                      <!-- The key is readingTargets.id (so in en.json, there is readingTargets.bereshit...) -->
                          <div class="d-flex justify-space-between align-start mb-2">
                            <span class="option-name text-truncate">
                              {{ $t(`readingTargets.${item.key}`) }}
                            </span>
                          </div>
                          
                      <!-- TODO 5: display a roll preview for the TO? When hover? -->
                      <!-- TODO 7: add special display for the only gola(/israel) readings. -->
                          <div class="d-flex align-center text-caption text-medium-emphasis">
                            <span>{{ $t('page') }} {{ item.ref.page }}</span>
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
                    class="option-card"
                    @click="select(item)"
                    v-ripple
                  >
                    <div class="d-flex justify-space-between align-start mb-2">
                      <span class="option-name text-truncate">
                        {{ $t(`readingTargets.${item.key}`) }}
                      </span>
                    </div>
                    
                    <div class="d-flex align-center text-caption text-medium-emphasis">
                      <span>{{ $t('page') }} {{ item.ref.page }}</span>
                    </div>
                  </div>
                </div>

              </div>
            </v-expand-transition>
          </div>
        </template>

      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useOptionsStore } from '@/stores/options';
import targetsData from '@/data/target_pages.json';

import { useI18n } from 'vue-i18n';
const { t } = useI18n();

interface TargetItem {
  key: string;
  group: string;
  gola: boolean;
  type: 'parasha' | 'holyday';
  ref: {
    book: number;
    chapter: number;
    verse: number;
    page: number;
  };
}

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  side: { type: String as () => 'from' | 'to', default: 'to' },
  allowGola: { type: Boolean, default: false },
  // Future TODO 6: Pass the group key here (e.g. 'genesis') to auto-open it
  initialOpenGroup: { type: String, default: null } 
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'select', item: TargetItem): void;
}>();

const store = useOptionsStore();
const filter = ref('');
const isFullList = ref(true); 
const localIsInGola = ref(store.isInGola);

// Tracks which Outer Sections (Types) are collapsed.
// Default: empty object means all are expanded (false).
const sectionCollapsed = ref<Record<string, boolean>>({});

// Tracks which Inner Groups (Accordion) are open. 
// Bound to v-model of v-expansion-panels.
const openGroups = ref<string[]>([]);

// --- Watchers ---

watch(localIsInGola, (v) => store.changeIsInGola(v));

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
});

// Watch for the prop to set initial open group (For TODO 6)
watch(() => props.initialOpenGroup, (newVal) => {
  if (newVal) {
    // Add the group to the open list if not already there
    if (!openGroups.value.includes(newVal)) {
      openGroups.value.push(newVal);
    }
  }
}, { immediate: true });

// --- Logic ---

const toggleSection = (type: string) => {
  sectionCollapsed.value[type] = !sectionCollapsed.value[type];
};

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
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

const select = (item: TargetItem) => {  
  emit('select', item);
  open.value = false;
};

const close = () => {
  open.value = false;
};
</script>

<style scoped>
.search-container {
  width: 100%;
  max-width: 300px;
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

.option-name { 
  font-weight: 600; 
  font-size: 1rem;
  line-height: 1.2;
}

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