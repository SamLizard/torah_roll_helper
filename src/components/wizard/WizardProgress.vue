<template>
  <div class="wizard-progress my-4" :dir="isRtl ? 'rtl' : 'ltr'">
    <div class="progress-track">
      <div 
        class="progress-bar-fill" 
        :style="{ width: fillWidth }"
      ></div>
    </div>
    
    <div class="steps-container">
      <div 
        v-for="step in steps" 
        :key="step.number" 
        class="step-item"
        :class="{ 
          'is-active': currentStep === step.number,
          'is-completed': currentStep > step.number 
        }"
        @click="goToStep(step.number)"
      >
        <div class="step-circle">
          <v-icon v-if="currentStep > step.number" size="18">mdi-check</v-icon>
          <span v-else>{{ step.number }}</span>
        </div>
        <div class="step-label text-caption mt-1 font-weight-medium">
          {{ step.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRtl } from 'vuetify';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  currentStep: number;
  maxPageSet: boolean;
}>();

const emit = defineEmits<{
  (e: 'navigate', step: number): void;
}>();

const { isRtl } = useRtl();
const { t } = useI18n();

const steps = computed(() => [
  { number: 1, label: t('home.from.title') },
  { number: 2, label: t('home.to.title') },
  { number: 3, label: t('result.title') }
]);

const fillWidth = computed(() => {
  if (props.currentStep === 1) return '0%';
  if (props.currentStep === 2) return '50%';
  return '100%';
});

const goToStep = (stepNumber: number) => {
  if (stepNumber === 2 && !props.maxPageSet) return; // Prevent going to step 2 without step 1 complete
  emit('navigate', stepNumber);
};
</script>

<style scoped>
.wizard-progress {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 15px 0;
}

.progress-track {
  position: absolute;
  top: 29px;
  left: 30px;
  right: 30px;
  height: 4px;
  background-color: rgba(248, 250, 252, 0.12);
  z-index: 1;
  border-radius: 2px;
}

.progress-bar-fill {
  height: 100%;
  background-color: rgb(var(--v-theme-primary));
  transition: width 0.3s ease;
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(var(--v-theme-primary), 0.5);
}

.steps-container {
  position: relative;
  display: flex;
  justify-content: space-between;
  z-index: 2;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  cursor: pointer;
  text-align: center;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-surface));
  border: 2px solid rgba(248, 250, 252, 0.2);
  color: rgba(248, 250, 252, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-label {
  color: rgba(248, 250, 252, 0.5);
  transition: all 0.3s ease;
  max-width: 100px;
  font-size: 0.75rem !important;
}

.step-item.is-active .step-circle {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-background));
  box-shadow: 0 0 16px rgba(var(--v-theme-primary), 0.4);
}

.step-item.is-active .step-label {
  color: rgb(var(--v-theme-primary));
  font-weight: 700 !important;
}

.step-item.is-completed .step-circle {
  border-color: rgb(var(--v-theme-secondary));
  background-color: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-background));
  box-shadow: 0 0 10px rgba(var(--v-theme-secondary), 0.25);
}

.step-item.is-completed .step-label {
  color: rgb(var(--v-theme-secondary));
}
</style>
