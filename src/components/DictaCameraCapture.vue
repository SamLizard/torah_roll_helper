<template>
  <!--
    ┌─────────────────────────────────────────────────────────────────┐
    │  CONFIRM SCREEN                                                  │
    │  Teleported to <body> + position:fixed so it always covers      │
    │  the whole screen. Mirrors Dicta's CameraConfirm.vue exactly.   │
    └─────────────────────────────────────────────────────────────────┘
  -->
  <Teleport to="body">
    <div v-if="confirmPictureSrc" class="dcc-confirm">
      <div class="dcc-confirm-buttons">
        <button class="dcc-confirm-btn" @click="confirmPhoto">
          <v-icon size="30" color="black">mdi-check</v-icon>
        </button>
        <button class="dcc-confirm-btn" @click="cancelConfirm">
          <v-icon size="30" color="black">mdi-close</v-icon>
        </button>
      </div>
      <img class="dcc-confirm-picture" :src="confirmPictureSrc" :alt="t('home.dicta.capture')" />
    </div>
  </Teleport>

  <!--
    ┌─────────────────────────────────────────────────────────────────┐
    │  MOBILE CAMERA  (mobileMode=true)                               │
    │  position:fixed inset:0 — identical to Dicta's Camera.vue.     │
    │  Has its own X button because it covers HomeView's header.     │
    └─────────────────────────────────────────────────────────────────┘
  -->
  <div
    v-if="mobileMode && !confirmPictureSrc"
    class="dcc-mobile"
    :style="mobileStyle"
  >
    <!-- Close (X) — top corner, RTL-aware -->
    <button
      class="dcc-mobile-close"
      :class="isRtl ? 'dcc-mobile-close--start' : 'dcc-mobile-close--end'"
      @click="emit('close')"
    >
      <v-icon size="20" color="white">mdi-close</v-icon>
    </button>

    <!-- Landscape side panel (hidden in portrait) -->
    <div class="dcc-mobile-side">
      <div v-if="flashAvailable" @click="toggleFlash">
        <button class="dcc-flash-btn">
          <v-icon v-if="flashOn" size="34" color="white">mdi-flash-off</v-icon>
          <v-icon v-else size="34" color="white">mdi-flash</v-icon>
        </button>
      </div>
      <button
        class="dcc-mobile-shutter"
        :disabled="pictureDelay || busy"
        @click="sayCheese"
      ></button>
      <div v-if="flashAvailable" style="width:40px;height:40px;"></div>
    </div>

    <!-- Video holder — takes all remaining space -->
    <div class="dcc-mobile-video-holder" ref="videoHolder">

      <!-- Portrait flash button -->
      <div v-if="flashAvailable" class="dcc-portrait-flash" @click="toggleFlash">
        <button class="dcc-flash-btn">
          <v-icon v-if="flashOn" size="34" color="white">mdi-flash-off</v-icon>
          <v-icon v-else size="34" color="white">mdi-flash</v-icon>
        </button>
      </div>

      <!-- Error (replaces video entirely, like Dicta's v-if="error") -->
      <div v-if="mobileError" class="dcc-mobile-error">
        <div class="dcc-mobile-error-content">
          <p class="dcc-mobile-error-title">{{ t('home.dicta.cameraUnavailable') }}</p>
          <p class="dcc-mobile-error-hint">
            {{ isHttpsError ? t('home.dicta.cameraHttpsHint') : mobileError }}
          </p>
          <div class="dcc-mobile-error-actions">
            <v-btn
              v-if="!isHttpsError"
              color="primary"
              size="small"
              prepend-icon="mdi-refresh"
              @click="startCamera"
            >
              {{ t('home.dicta.retryCamera') }}
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              prepend-icon="mdi-image"
              @click="openFilePicker"
            >
              {{ t('home.dicta.chooseFile') }}
            </v-btn>
          </div>
        </div>
      </div>

      <template v-else>
        <video ref="videoEl" class="dcc-video" playsinline muted></video>

        <!-- Countdown ring -->
        <svg v-if="pictureDelay" class="dcc-delay-svg" height="100" width="100">
          <circle
            transform="rotate(-90, 50, 50)"
            class="dcc-delay-circle"
            cx="50" cy="50" r="45"
            stroke="#ffffff" stroke-width="5" fill="none"
          />
        </svg>

        <!-- Dark masks (4 sides) -->
        <div class="dcc-frame dcc-frame--top"></div>
        <div class="dcc-frame dcc-frame--bottom"></div>
        <div class="dcc-frame dcc-frame--right"></div>
        <div class="dcc-frame dcc-frame--left"></div>

        <!-- Yellow guidelines -->
        <div class="dcc-guidelines"></div>

        <!-- Corner brackets -->
        <div class="dcc-bracket dcc-bracket--left"></div>
        <div class="dcc-bracket dcc-bracket--right"></div>

        <!-- Instructions in the bottom dark band -->
        <ul class="dcc-instructions" :dir="isRtl ? 'rtl' : 'ltr'">
          <li>{{ t('home.dicta.instructions.1') }}</li>
          <li>{{ t('home.dicta.instructions.2') }}</li>
          <li>{{ t('home.dicta.instructions.3') }}</li>
        </ul>

        <!-- Portrait shutter -->
        <button
          class="dcc-portrait-shutter"
          :disabled="pictureDelay || busy"
          @click="sayCheese"
        ></button>
      </template>
    </div>
  </div>

  <!--
    ┌─────────────────────────────────────────────────────────────────┐
    │  DESKTOP CAMERA  (mobileMode=false)                             │
    │  Self-contained: fixed-aspect-ratio preview box + buttons       │
    │  below. Never depends on parent height.                         │
    └─────────────────────────────────────────────────────────────────┘
  -->
  <div
    v-else-if="!mobileMode && !confirmPictureSrc"
    class="dcc-desktop"
  >
    <!-- Error state -->
    <div v-if="desktopError" class="dcc-desktop-error">
      <v-icon size="44" color="error" class="mb-2">mdi-camera-off</v-icon>
      <p class="dcc-desktop-error-title">{{ t('home.dicta.cameraUnavailable') }}</p>
      <p v-if="isHttpsError" class="dcc-desktop-error-hint">{{ t('home.dicta.cameraHttpsHint') }}</p>
      <p v-else class="dcc-desktop-error-hint">{{ desktopError }}</p>
      <div class="dcc-desktop-error-actions">
        <v-btn
          v-if="!isHttpsError"
          color="primary"
          size="small"
          prepend-icon="mdi-refresh"
          @click="startCamera"
        >
          {{ t('home.dicta.retryCamera') }}
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          prepend-icon="mdi-image"
          @click="openFilePicker"
        >
          {{ t('home.dicta.chooseFile') }}
        </v-btn>
      </div>
    </div>

    <template v-else>
      <!-- Preview box with fixed aspect ratio — never collapses -->
      <div class="dcc-desktop-preview" ref="videoHolder">

        <video ref="videoEl" class="dcc-video-desktop" playsinline muted></video>

        <!-- Countdown ring -->
        <svg v-if="pictureDelay" class="dcc-delay-svg" height="100" width="100">
          <circle
            transform="rotate(-90, 50, 50)"
            class="dcc-delay-circle"
            cx="50" cy="50" r="45"
            stroke="#ffffff" stroke-width="5" fill="none"
          />
        </svg>

        <!-- Dark masks -->
        <div class="dcc-frame dcc-frame--top"></div>
        <div class="dcc-frame dcc-frame--bottom"></div>
        <div class="dcc-frame dcc-frame--right"></div>
        <div class="dcc-frame dcc-frame--left"></div>

        <!-- Yellow guidelines -->
        <div class="dcc-guidelines"></div>

        <!-- Corner brackets -->
        <div class="dcc-bracket dcc-bracket--left"></div>
        <div class="dcc-bracket dcc-bracket--right"></div>

        <!-- Instructions in the bottom dark band -->
        <ul class="dcc-instructions" :dir="isRtl ? 'rtl' : 'ltr'">
          <li>{{ t('home.dicta.instructions.1') }}</li>
          <li>{{ t('home.dicta.instructions.2') }}</li>
          <li>{{ t('home.dicta.instructions.3') }}</li>
        </ul>
      </div>

      <!-- Action buttons below the preview -->
      <div class="dcc-desktop-actions">
        <v-btn
          color="primary"
          prepend-icon="mdi-camera"
          :disabled="busy || !cameraReady || pictureDelay"
          @click="sayCheese"
        >
          {{ t('home.dicta.capture') }}
        </v-btn>
        <v-btn
          v-if="!hideFileButton"
          variant="tonal"
          prepend-icon="mdi-image"
          :disabled="busy"
          @click="openFilePicker"
        >
          {{ t('home.dicta.chooseFile') }}
        </v-btn>
      </div>
    </template>
  </div>

  <!-- Hidden file input (always present for file-picker fallback) -->
  <input
    ref="fileInputEl"
    class="dcc-hidden-input"
    type="file"
    accept="image/*"
    @change="onFilePicked"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRtl } from 'vuetify';

// ─────────────────────────────────────────────────────────────────────────────
// Props & emits
// Same as what HomeView already uses, plus 'close' for the mobile X button.
// ─────────────────────────────────────────────────────────────────────────────
const props = defineProps({
  busy:           { type: Boolean, default: false },
  autoFallback:   { type: Boolean, default: false },
  hideFileButton: { type: Boolean, default: false },
  suppressErrors: { type: Boolean, default: false },
  mobileMode:     { type: Boolean, default: false },
});

const emit = defineEmits<{
  (e: 'captured', file: File): void;
  (e: 'error',    message: string): void;
  (e: 'close'): void;
}>();

const { t }     = useI18n();
const { isRtl } = useRtl();

// ─────────────────────────────────────────────────────────────────────────────
// Constants  (from Dicta's Camera.vue)
// ─────────────────────────────────────────────────────────────────────────────
const X_PERCENT  = 0.8;
const Y_PERCENT  = 0.3;
const PIXEL_WIDTH = 1500 / X_PERCENT; // 1875

// ─────────────────────────────────────────────────────────────────────────────
// Template refs
// ─────────────────────────────────────────────────────────────────────────────
const videoEl     = ref<HTMLVideoElement | null>(null);
const videoHolder = ref<HTMLElement | null>(null);
const fileInputEl = ref<HTMLInputElement | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Reactive state
// ─────────────────────────────────────────────────────────────────────────────
const previewWidth      = ref(640);
const flashAvailable    = ref(false);
const flashOn           = ref(false);
const cameraReady       = ref(false);
const mobileError       = ref('');
const desktopError      = ref('');
const isHttpsError      = ref(false);
const pictureDelay      = ref(false);
const confirmPictureSrc = ref<string | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Non-reactive camera state (mirrors Dicta's Camera.vue module-level vars)
// ─────────────────────────────────────────────────────────────────────────────
let canvas:     HTMLCanvasElement | null = null;
let streaming   = false;
let track:      MediaStreamTrack | null  = null;
let capturer:   {
  takePhoto(opts?: unknown): Promise<Blob>;
  getPhotoCapabilities?(): Promise<{ imageWidth?: { max?: number } }>;
} | null = null;
let zoom       = 1.5;
let minZoom    = 1;
let maxZoom    = 10;
let zoomStep   = 0.1;
let pendingBlob: Blob | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// CSS variable for mobile (same formula as Dicta's Camera.vue boundStyle)
// ─────────────────────────────────────────────────────────────────────────────
const mobileStyle = computed(() => ({
  '--y-percentage': `calc((100% - 0.3 * ${previewWidth.value}px) / 2)`,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Camera selection — direct port of Dicta's Camera.vue selectCamera()
// ─────────────────────────────────────────────────────────────────────────────
async function selectCamera(): Promise<void> {
  // Secure-context guard (getUserMedia is undefined on HTTP on mobile)
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    isHttpsError.value = true;
    throw new Error(t('home.dicta.cameraUnavailable'));
  }
  isHttpsError.value = false;

  const constraints: { audio: false; video: Record<string, unknown> } = {
    audio: false,
    video: { facingMode: 'environment', zoom } as Record<string, unknown>,
  };

  const savedCamera = localStorage.getItem('savedCamera');
  if (savedCamera && !savedCamera.startsWith('[')) {
    constraints.video = { deviceId: savedCamera };
  }

  let mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  const devicesPromise = navigator.mediaDevices.enumerateDevices();
  track = mediaStream.getVideoTracks()[0] ?? null;

  // ── Score cameras and pick the best one (Dicta's algorithm) ────────────────
  type CapResult = {
    score: number; hasTorch: boolean; deviceId: string;
    zoom?: { max: number; min: number; step: number };
  };

  const getCapFn = (t2: MediaStreamTrack) =>
    (t2 as MediaStreamTrack & { getCapabilities?(): Record<string, unknown> }).getCapabilities;

  if (track && typeof getCapFn(track) === 'function') {
    const processCapabilities = (t2: MediaStreamTrack): CapResult => {
      const cap = new Map(Object.entries(
        (t2 as MediaStreamTrack & { getCapabilities(): Record<string, unknown> }).getCapabilities()
      ));
      const hasTorch   = !!cap.get('torch');
      const facingMode = cap.get('facingMode') as string[] | undefined;
      const focusMode  = cap.get('focusMode')  as string[] | undefined;
      const score =
        (facingMode?.[0] === 'environment' ? 8 : 0) +
        (focusMode?.includes('continuous') ? 4 : 0) +
        (cap.has('zoom')                   ? 2 : 0) +
        (hasTorch                          ? 1 : 0);
      return { score, hasTorch, deviceId: cap.get('deviceId') as string, zoom: cap.get('zoom') as CapResult['zoom'] };
    };

    let { score: bestScore, hasTorch: bestHasTorch, deviceId: bestDevice, zoom: bestZoom } =
      processCapabilities(track);
    let lastDevice = bestDevice;

    if (bestScore !== 15 && !savedCamera) {
      const devices = (await devicesPromise).filter(
        (d) => d.kind === 'videoinput' && d.deviceId !== bestDevice
      );
      for (const device of devices) {
        track.stop();
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: device.deviceId } });
        track = mediaStream.getVideoTracks()[0] ?? null;
        if (!track) break;
        lastDevice = device.deviceId;
        const { score, hasTorch, zoom: tz } = processCapabilities(track);
        if (score > bestScore) {
          bestScore = score; bestDevice = device.deviceId;
          bestHasTorch = hasTorch; bestZoom = tz;
        }
      }
      localStorage.setItem('savedCamera', bestDevice);
      // Re-open best device if the loop ended on a different one
      if (lastDevice !== bestDevice) {
        track.stop();
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: bestDevice } });
        track = mediaStream.getVideoTracks()[0] ?? null;
      }
    }

    flashAvailable.value = bestHasTorch;
    if (bestZoom) { maxZoom = bestZoom.max; minZoom = bestZoom.min; zoomStep = bestZoom.step; }
  }

  // ── Set up ImageCapture API (higher-quality stills) ────────────────────────
  type ICtor = new (t2: MediaStreamTrack) => typeof capturer;
  const win = window as Window & { ImageCapture?: ICtor };
  if (win.ImageCapture && track) {
    try {
      track.applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet] }).catch(() => {});
      capturer = new win.ImageCapture(track) as typeof capturer;
      track.applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet] }).catch(() => {});
    } catch { capturer = null; }
  }

  // ── Attach stream to <video> ───────────────────────────────────────────────
  const video = videoEl.value;
  if (!video) return;
  video.srcObject = mediaStream;
  video.onloadedmetadata = () => { void video.play(); };
  video.addEventListener('canplay', () => {
    if (!streaming) { canvas = document.createElement('canvas'); streaming = true; cameraReady.value = true; }
  }, false);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: start / restart
// ─────────────────────────────────────────────────────────────────────────────
async function startCamera(): Promise<void> {
  stopCamera();
  canvas = null;
  mobileError.value = desktopError.value = '';
  cameraReady.value = false;

  try {
    await selectCamera();
  } catch (err) {
    const msg = err instanceof Error ? err.message : t('home.dicta.cameraUnavailable');
    if (props.mobileMode) {
      if (!props.suppressErrors) emit('error', msg);
      if (!props.suppressErrors || props.autoFallback) mobileError.value = msg;
      if (props.autoFallback) openFilePicker();
    } else {
      desktopError.value = msg;
      emit('error', msg);
      if (props.autoFallback) openFilePicker();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Photo capture — port of Dicta's sayCheese / emitPhoto / fallbackPhoto
// ─────────────────────────────────────────────────────────────────────────────
async function sayCheese(): Promise<void> {
  if (pictureDelay.value || props.busy) return;
  const video = videoEl.value;
  if (!video) return;

  pictureDelay.value = true;
  await new Promise<void>((r) => setTimeout(r, 900)); // same 900 ms delay as Dicta

  if (capturer) {
    try {
      const caps = capturer.getPhotoCapabilities ? await capturer.getPhotoCapabilities() : undefined;
      const blob = await capturer.takePhoto(
        caps?.imageWidth?.max
          ? { fillLightMode: flashOn.value ? 'flash' : 'off', redEyeReduction: false, imageWidth: caps.imageWidth.max }
          : undefined
      );
      await emitPhoto(blob);
    } catch { await fallbackPhoto(video); }
  } else {
    await fallbackPhoto(video);
  }
}

async function fallbackPhoto(video: HTMLVideoElement): Promise<void> {
  if (streaming && canvas) {
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { pictureDelay.value = false; return; }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) void emitPhoto(blob);
      else { pictureDelay.value = false; emit('error', t('home.dicta.captureFailed')); }
    });
  } else {
    pictureDelay.value = false;
    emit('error', t('home.dicta.captureFailed'));
  }
}

async function emitPhoto(blob: Blob): Promise<void> {
  pictureDelay.value = false;
  stopCamera();

  try {
    const img = await createImageBitmap(blob);
    const FRAME = 10;
    const sliceWidth  = PIXEL_WIDTH * X_PERCENT;  // 1500
    const sliceHeight = PIXEL_WIDTH * Y_PERCENT;  // 562.5

    if (!canvas) canvas = document.createElement('canvas');
    canvas.width  = sliceWidth  + 2 * FRAME;
    canvas.height = sliceHeight + 2 * FRAME;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas ctx unavailable');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sourceSliceHeight = img.width * Y_PERCENT;
    ctx.drawImage(
      img,
      img.width * ((1 - X_PERCENT) / 2),
      (img.height - sourceSliceHeight) / 2,
      img.width * X_PERCENT, sourceSliceHeight,
      FRAME, FRAME, sliceWidth, sliceHeight
    );

    await new Promise<void>((resolve) => {
      const mime = !navigator.vendor.startsWith('Apple') ? 'image/webp' : 'image/jpeg';
      canvas!.toBlob((cropped) => {
        if (!cropped) { resolve(); return; }
        pendingBlob = cropped;
        confirmPictureSrc.value = URL.createObjectURL(cropped);
        resolve();
      }, mime);
    });
  } catch {
    emit('error', t('home.dicta.captureFailed'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm / cancel
// ─────────────────────────────────────────────────────────────────────────────
function confirmPhoto(): void {
  if (!pendingBlob) return;
  const ext  = pendingBlob.type === 'image/webp' ? 'webp' : 'jpg';
  const file = new File([pendingBlob], `dicta-capture-${Date.now()}.${ext}`, {
    type: pendingBlob.type || 'image/jpeg',
  });
  cleanupConfirm();
  emit('captured', file);
}

function cancelConfirm(): void {
  cleanupConfirm();
  void startCamera();
}

function cleanupConfirm(): void {
  if (confirmPictureSrc.value) { URL.revokeObjectURL(confirmPictureSrc.value); confirmPictureSrc.value = null; }
  pendingBlob = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function stopCamera(): void {
  if (track) { track.stop(); track = null; }
  streaming = false; capturer = null; cameraReady.value = false;
}

function openFilePicker(): void {
  const el = fileInputEl.value;
  if (!el) return;
  el.value = '';
  el.click();
}

function onFilePicked(event: Event): void {
  const file = (event.target as HTMLInputElement | null)?.files?.[0] ?? null;
  if (!file) return;
  emit('captured', file);
}

function toggleFlash(): void {
  if (flashAvailable.value && track) {
    flashOn.value = !flashOn.value;
    track.applyConstraints({ advanced: [{ torch: flashOn.value } as MediaTrackConstraintSet] });
  }
}

function updatePreviewWidth(): void {
  if (videoHolder.value) previewWidth.value = videoHolder.value.getBoundingClientRect().width;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
onMounted(() => {
  zoom = 1.5;
  updatePreviewWidth();
  window.addEventListener('resize', updatePreviewWidth);
  void startCamera();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePreviewWidth);
  stopCamera();
  cleanupConfirm();
});
</script>

<style scoped>
/* ===========================================================================
   CONFIRM SCREEN  (teleported to body)
   Mirrors Dicta's CameraConfirm.vue exactly.
   =========================================================================== */
.dcc-confirm {
  position: fixed;
  inset: 0;
  background: #000;
  color: #fff;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
}

.dcc-confirm-buttons { display: flex; flex-direction: column; }

.dcc-confirm-btn {
  border-radius: 50%;
  border: 2px solid white;
  margin: 50px;
  background: #fff;
  color: #000;
  font-size: 30px;
  width: 72px;
  height: 72px;
  line-height: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 991px) {
  .dcc-confirm {
    flex-direction: column-reverse;
  }

  .dcc-confirm-buttons {
    flex-direction: row-reverse;
  }

  .dcc-confirm-btn {
    margin: 0 12px 80px;
  }
}

.dcc-confirm-picture {
  max-height: 100%;
  max-width: 100%;
  min-width: 100px;
  min-height: 100px;
  object-fit: contain;
  flex: auto;
}

/* ===========================================================================
   MOBILE CAMERA — position:fixed fullscreen, identical to Dicta's Camera.vue
   =========================================================================== */
.dcc-mobile {
  position: fixed;
  top: 0; right: 0; left: 0; bottom: 0;
  background-color: black;
  color: white;
  z-index: 9999;
  display: flex;
  align-items: center;
  --x-percentage: 10%;
  --y-percentage: calc((100% - 30vw) / 2); /* approximation; corrected by JS */
}

@media (orientation: portrait) {
  .dcc-mobile      { flex-direction: column-reverse; }
  .dcc-mobile-side { display: none !important; }
}

/* Close button */
.dcc-mobile-close {
  position: absolute;
  top: 16px;
  z-index: 10001;
  background: rgba(0,0,0,0.55);
  color: #fff;
  border: 2px solid rgba(255,255,255,0.6);
  border-radius: 50%;
  width: 44px; height: 44px;
  font-size: 18px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.dcc-mobile-close--end   { right: 16px; }
.dcc-mobile-close--start { left:  16px; }

/* Landscape side panel */
.dcc-mobile-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  height: 100%;
}

.dcc-mobile-shutter {
  border-radius: 50%;
  border: 25px solid white;
  padding: 0; margin: 50px;
  background: transparent;
  cursor: pointer;
  width: 80px; height: 80px;
  position: relative;
}

.dcc-mobile-shutter:disabled { opacity: 0.5; cursor: default; }

.dcc-mobile-shutter::after {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.95);
}

/* Video holder */
.dcc-mobile-video-holder {
  position: relative;
  flex: auto;
  align-self: stretch;
  overflow: hidden;
  touch-action: none;
}

/* Portrait flash */
.dcc-portrait-flash {
  position: absolute;
  top: 100px; left: 20px;
  z-index: 10;
}

@media (orientation: landscape) {
  .dcc-portrait-flash,
  .dcc-portrait-shutter { display: none !important; }
}

/* Mobile error screen (white box, exactly like Dicta's .error) */
.dcc-mobile-error {
  width: 100%; height: 100%;
  overflow: auto;
  background-color: white; color: black;
  padding: 20px;
  white-space: pre-wrap;
  text-align: left;
  display: flex; align-items: center; justify-content: center;
}

.dcc-mobile-error-content {
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dcc-mobile-error-title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
  text-align: center;
}

.dcc-mobile-error-hint {
  margin: 0;
  font-size: 0.9rem;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.dcc-mobile-error-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Mobile video */
.dcc-video {
  width: 100%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

/* Portrait shutter */
.dcc-portrait-shutter {
  position: absolute;
  bottom: 20px;
  left: 50%; margin-left: -34px;
  border-radius: 50%;
  width: 68px; height: 68px;
  border: 7px solid rgba(216,216,216,0.9);
  background: transparent;
  cursor: pointer;
  z-index: 20;
}

.dcc-portrait-shutter:disabled { opacity: 0.5; cursor: default; }

.dcc-portrait-shutter::after {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  border: 3px solid rgba(216, 216, 216, 0.92);
}

/* ===========================================================================
   DESKTOP CAMERA — self-contained, no fixed positioning
   =========================================================================== */
.dcc-desktop {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Error */
.dcc-desktop-error {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  padding: 24px 16px;
  background: rgba(var(--v-theme-surface-variant, 245 245 245));
  border-radius: 12px;
  gap: 4px;
}

.dcc-desktop-error-title { font-weight: 600; font-size: 1rem; margin: 0; }

.dcc-desktop-error-hint {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  max-width: 42ch;
  margin: 0 0 8px;
}

.dcc-desktop-error-actions {
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 4px;
}

/* Preview box: 4:3 aspect ratio with a sensible max height — NEVER collapses */
.dcc-desktop-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 60vh;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  /* Desktop --y-percentage tuned for 4:3 box:
     0.3 * width / (0.75 * width) = 40% height on each side
     But that leaves only 20% window — use 30% for a better centre area */
  --x-percentage: 10%;
  --y-percentage: 30%;
}

/* Desktop video fills the box */
.dcc-video-desktop {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
}

/* Desktop action buttons */
.dcc-desktop-actions {
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
}

/* ===========================================================================
   SHARED OVERLAY ELEMENTS
   All use --x-percentage / --y-percentage from their parent container.
   =========================================================================== */

/* Dark masks */
.dcc-frame { position: absolute; background: #000; opacity: 0.35; }

.dcc-frame--top    { top: 0;    height: var(--y-percentage); left: 0;  right: 0; }
.dcc-frame--bottom { bottom: 0; height: var(--y-percentage); left: 0;  right: 0; }
.dcc-frame--right  { top: var(--y-percentage); bottom: var(--y-percentage); width: var(--x-percentage); right: 0; }
.dcc-frame--left   { top: var(--y-percentage); bottom: var(--y-percentage); width: var(--x-percentage); left: 0;  }

/* Yellow guidelines */
.dcc-guidelines {
  position: absolute;
  left:   calc(var(--x-percentage) + 7%);
  top:    calc(var(--y-percentage) + 25px);
  height: calc(100% - var(--y-percentage) * 2 - 50px);
  width:  calc(86% - var(--x-percentage) * 2);
  border-top: 4px solid #ffde00; border-bottom: 4px solid #ffde00;
}

.dcc-guidelines::after {
  content: '';
  position: absolute; top: 50%; margin-top: -2px;
  height: 4px; width: 100%; background: #ffde00;
}

/* Corner brackets */
.dcc-bracket {
  position: absolute;
  top: var(--y-percentage);
  height: calc(100% - var(--y-percentage) * 2);
  width: 20px;
  border-top: 3px solid #fff; border-bottom: 3px solid #fff;
}

.dcc-bracket--left  { left:  var(--x-percentage); border-left:  3px solid #fff; }
.dcc-bracket--right { right: var(--x-percentage); border-right: 3px solid #fff; }

.dcc-bracket--left::before,  .dcc-bracket--left::after,
.dcc-bracket--right::before, .dcc-bracket--right::after {
  content: ''; position: absolute;
  top: -2px; left: 0; height: 20px; width: 3px; background: #fff;
}

.dcc-bracket--right::before, .dcc-bracket--right::after { left: calc(100% - 3px); }
.dcc-bracket--left::after,   .dcc-bracket--right::after { top:  calc(100% - 19px); }

/*
  Instructions — in the bottom dark band, aligned inside that band.
  z-index: 1 so they sit on top of the semi-transparent mask.
*/
.dcc-instructions {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: var(--y-percentage);
  color: #fff;
  font-size: 0.80rem;
  line-height: 1.3;
  list-style: disc;
  padding: 6px 20px 6px 36px;
  margin: 0;
  display: flex; flex-direction: column; justify-content: center; gap: 3px;
  z-index: 1;
  pointer-events: none;
}

/* ===========================================================================
   SHARED: countdown ring, flash, hidden input
   =========================================================================== */
.dcc-delay-svg {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%); z-index: 5;
}

.dcc-delay-circle {
  stroke-dasharray: 600; stroke-dashoffset: 0;
  animation: dccDelayStroke 1s ease-out reverse;
}

@keyframes dccDelayStroke { to { stroke-dashoffset: 600; } }

.dcc-flash-btn {
  border: none; background: transparent; color: #fff;
  font-size: 34px; outline: none; cursor: pointer; line-height: 1;
}

.dcc-hidden-input { display: none; }
</style>
