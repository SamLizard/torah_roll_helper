<template>
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

        <div class="options-grid">
          <div
            v-for="item in pagedOptions"
            :key="item.id"
            class="option-card"
            @click="select(item)"
            v-ripple
          >
            <div class="d-flex justify-space-between align-start mb-2">
              <span class="option-name text-truncate">
                {{ item[$vuetify.locale.current] ?? item[$vuetify.locale.fallback] }}
              </span>
              <v-icon size="small" color="primary" v-if="item.isFavorite">mdi-star</v-icon>
            </div>
            
            <div class="d-flex align-center text-caption text-medium-emphasis">
              <v-chip size="x-small" label class="me-2">{{ item.type }}</v-chip>
              <span>{{ $t('page') }} {{ item.ref.page }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="pagedOptions.length === 0" class="text-center mt-12 text-medium-emphasis">
          {{ $t('noResults') }}
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOptionsStore } from '@/stores/options';
import targetsData from '@/data/target_pages.json';

// Type definitions for your JSON data (adjust as needed)
interface TargetItem {
  id: string | number;
  type: string;
  name: string;
  ref: { page: number; [key: string]: any };
  [key: string]: any; // for locale keys
}

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  side: { type: String as () => 'from' | 'to', default: 'to' },
  allowGola: { type: Boolean, default: false }
});

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'select', item: TargetItem): void;
}>();

const store = useOptionsStore();
const filter = ref('');
const isFullList = ref(true); 

// Sync model wrapper
const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
});

// Gola state management
const localIsInGola = ref(store.isInGola);
watch(localIsInGola, (v) => store.changeIsInGola(v));

// Filtering
const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  // Cast to typed array
  const list = targetsData as TargetItem[];
  
  if (!q) return list;
  
  return list.filter((t) => {
    // Basic search on name, type, and page
    const searchStr = `${t.name} ${t.type} ${t.ref.page} ${t.en || ''} ${t.he || ''}`.toLowerCase();
    return searchStr.includes(q);
  });
});

const pagedOptions = computed(() => filtered.value);

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
</style>