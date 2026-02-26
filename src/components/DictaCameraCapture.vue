<template>
  <div class="dicta-camera">
    <div class="dicta-camera-preview">
      <video ref="videoEl" class="dicta-camera-video" playsinline muted />
      <div class="dicta-mask dicta-mask--top"></div>
      <div class="dicta-mask dicta-mask--bottom"></div>
      <div class="dicta-mask dicta-mask--left"></div>
      <div class="dicta-mask dicta-mask--right"></div>
      <div class="dicta-bracket dicta-bracket--left"></div>
      <div class="dicta-bracket dicta-bracket--right"></div>
      <div class="dicta-guidelines"></div>

      <ul class="dicta-instructions">
        <li v-for="(instruction, index) in instructions" :key="`instruction-${index}`">
          {{ instruction }}
        </li>
      </ul>
    </div>

    <div v-if="cameraError" class="dicta-camera-error">
      {{ cameraError }}
    </div>

    <div class="dicta-camera-actions">
      <v-btn
        color="primary"
        prepend-icon="mdi-camera"
        :disabled="busy || !cameraReady"
        @click="capturePhoto"
      >
        {{ captureLabel }}
      </v-btn>
      <v-btn
        variant="text"
        prepend-icon="mdi-image"
        :disabled="busy"
        @click="openFilePicker"
      >
        {{ pickFileLabel }}
      </v-btn>
      <v-btn
        v-if="cameraError"
        variant="text"
        prepend-icon="mdi-refresh"
        :disabled="busy"
        @click="startCamera"
      >
        {{ retryLabel }}
      </v-btn>
    </div>

    <input
      ref="fileInputEl"
      class="d-none"
      type="file"
      accept="image/*"
      capture="environment"
      @change="onFilePicked"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  busy: { type: Boolean, default: false },
});

const emit = defineEmits<{
  (e: 'captured', file: File): void;
  (e: 'error', message: string): void;
}>();

const { t } = useI18n();

const videoEl = ref<HTMLVideoElement | null>(null);
const fileInputEl = ref<HTMLInputElement | null>(null);
const cameraReady = ref(false);
const cameraError = ref('');
const streamRef = ref<MediaStream | null>(null);
const trackRef = ref<MediaStreamTrack | null>(null);
const imageCaptureRef = ref<{ takePhoto: (options?: unknown) => Promise<Blob>; getPhotoCapabilities?: () => Promise<{ imageWidth?: { max?: number } }> } | null>(null);

const captureLabel = computed(() => t('home.dicta.capture'));
const pickFileLabel = computed(() => t('home.dicta.chooseFile'));
const retryLabel = computed(() => t('home.dicta.retryCamera'));

const instructions = computed(() =>
  [
    t('home.dicta.instructions.1'),
    t('home.dicta.instructions.2'),
    t('home.dicta.instructions.3'),
  ]
);

const stopCamera = (): void => {
  const stream = streamRef.value;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  streamRef.value = null;
  trackRef.value = null;
  imageCaptureRef.value = null;
  cameraReady.value = false;
};

const asFile = (blob: Blob): File =>
  new File([blob], `dicta-capture-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });

const cropBlob = async (blob: Blob): Promise<Blob | null> => {
  const image = await createImageBitmap(blob);

  const xPercent = 0.8;
  const yPercent = 0.3;
  const sourceSliceHeight = Math.min(image.height, image.width * yPercent);
  const sourceX = image.width * ((1 - xPercent) / 2);
  const sourceY = Math.max(0, (image.height - sourceSliceHeight) / 2);
  const sourceW = image.width * xPercent;
  const sourceH = sourceSliceHeight;

  const frame = 10;
  const targetW = Math.round(sourceW + frame * 2);
  const targetH = Math.round(sourceH + frame * 2);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetW, targetH);
  context.drawImage(image, sourceX, sourceY, sourceW, sourceH, frame, frame, sourceW, sourceH);

  return await new Promise((resolve) => {
    canvas.toBlob((resultBlob) => resolve(resultBlob), 'image/jpeg', 0.97);
  });
};

const startCamera = async (): Promise<void> => {
  stopCamera();
  cameraError.value = '';

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    const message = t('home.dicta.cameraUnavailable');
    cameraError.value = message;
    emit('error', message);
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 2560 },
        height: { ideal: 1440 },
      },
    });

    streamRef.value = stream;
    trackRef.value = stream.getVideoTracks()[0] ?? null;

    const cameraWindow = window as Window & { ImageCapture?: new (track: MediaStreamTrack) => { takePhoto: (options?: unknown) => Promise<Blob>; getPhotoCapabilities?: () => Promise<{ imageWidth?: { max?: number } }> } };
    if (cameraWindow.ImageCapture && trackRef.value) {
      imageCaptureRef.value = new cameraWindow.ImageCapture(trackRef.value);
    }

    const video = videoEl.value;
    if (!video) return;

    video.srcObject = stream;
    await video.play();
    cameraReady.value = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : t('home.dicta.cameraUnavailable');
    cameraError.value = message;
    emit('error', message);
  }
};

const capturePhoto = async (): Promise<void> => {
  if (props.busy) return;
  if (!cameraReady.value) return;

  try {
    if (imageCaptureRef.value) {
      const capabilities = imageCaptureRef.value.getPhotoCapabilities
        ? await imageCaptureRef.value.getPhotoCapabilities()
        : undefined;

      const captured = await imageCaptureRef.value.takePhoto(
        capabilities?.imageWidth?.max
          ? { imageWidth: capabilities.imageWidth.max }
          : undefined
      );
      const cropped = await cropBlob(captured);
      if (cropped) {
        emit('captured', asFile(cropped));
        return;
      }
    }

    const video = videoEl.value;
    if (!video) return;
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = video.videoWidth;
    fallbackCanvas.height = video.videoHeight;
    const fallbackContext = fallbackCanvas.getContext('2d');
    if (!fallbackContext) return;
    fallbackContext.drawImage(video, 0, 0);

    const fallbackBlob = await new Promise<Blob | null>((resolve) => {
      fallbackCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.97);
    });
    if (!fallbackBlob) throw new Error(t('home.dicta.captureFailed'));
    const croppedFallback = await cropBlob(fallbackBlob);
    if (!croppedFallback) throw new Error(t('home.dicta.captureFailed'));
    emit('captured', asFile(croppedFallback));
  } catch (error) {
    const message = error instanceof Error ? error.message : t('home.dicta.captureFailed');
    cameraError.value = message;
    emit('error', message);
  }
};

const openFilePicker = (): void => {
  const input = fileInputEl.value;
  if (!input) return;
  input.value = '';
  input.click();
};

const onFilePicked = (event: Event): void => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  if (!file) return;
  emit('captured', file);
};

onMounted(() => {
  void startCamera();
});

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
.dicta-camera {
  width: 100%;
}

.dicta-camera-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: 62vh;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  --x-percentage: 10%;
  --y-percentage: 24%;
}

.dicta-camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dicta-mask {
  position: absolute;
  background: rgba(0, 0, 0, 0.35);
}

.dicta-mask--top {
  left: 0;
  right: 0;
  top: 0;
  height: var(--y-percentage);
}

.dicta-mask--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--y-percentage);
}

.dicta-mask--left {
  top: var(--y-percentage);
  bottom: var(--y-percentage);
  left: 0;
  width: var(--x-percentage);
}

.dicta-mask--right {
  top: var(--y-percentage);
  bottom: var(--y-percentage);
  right: 0;
  width: var(--x-percentage);
}

.dicta-bracket {
  position: absolute;
  top: var(--y-percentage);
  bottom: var(--y-percentage);
  width: 20px;
  border-top: 3px solid #fff;
  border-bottom: 3px solid #fff;
}

.dicta-bracket--left {
  left: var(--x-percentage);
  border-left: 3px solid #fff;
}

.dicta-bracket--right {
  right: var(--x-percentage);
  border-right: 3px solid #fff;
}

.dicta-guidelines {
  position: absolute;
  left: calc(var(--x-percentage) + 7%);
  right: calc(var(--x-percentage) + 7%);
  top: calc(var(--y-percentage) + 24px);
  bottom: calc(var(--y-percentage) + 24px);
  border-top: 4px solid #ffde00;
  border-bottom: 4px solid #ffde00;
}

.dicta-guidelines::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(50% - 2px);
  height: 4px;
  background: #ffde00;
}

.dicta-instructions {
  position: absolute;
  bottom: 8px;
  left: 20px;
  right: 20px;
  color: #fff;
  font-size: 0.78rem;
  line-height: 1.25;
  margin: 0;
  padding-inline-start: 18px;
}

.dicta-camera-error {
  margin-top: 10px;
  color: rgb(var(--v-theme-error));
  font-size: 0.86rem;
  text-align: center;
}

.dicta-camera-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .dicta-camera-preview {
    max-height: 56vh;
  }
}
</style>
