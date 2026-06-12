<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BaseButton from '../../ui/BaseButton.vue'
import type { UpdateStatus } from '../../../../shared/types'

type StatusWithBanner = UpdateStatus & { showBanner: boolean }

const status = ref<StatusWithBanner>({
  currentVersion: '',
  latestVersion: null,
  updateAvailable: false,
  releaseUrl: 'https://snipforge.dev',
  lastChecked: null,
  showBanner: false,
})

let cleanupListener: (() => void) | null = null

onMounted(async () => {
  try {
    const s = await (window.electronAPI as any).update.getStatus()
    status.value = s
  } catch (e) {
    console.warn('[UpdateBanner] Failed to get status:', e)
  }

  cleanupListener = (window.electronAPI as any).update.onStatusChanged((data: StatusWithBanner) => {
    status.value = data
  })
})

onUnmounted(() => {
  if (cleanupListener) cleanupListener()
})

async function handleUpdate() {
  try {
    await (window.electronAPI as any).shell.openExternal(status.value.releaseUrl)
    await (window.electronAPI as any).update.dismiss()
    status.value = { ...status.value, showBanner: false }
  } catch (e) {
    console.warn('[UpdateBanner] Failed to open URL:', e)
  }
}

async function handleRemindLater() {
  try {
    await (window.electronAPI as any).update.remindLater()
    status.value = { ...status.value, showBanner: false }
  } catch (e) {
    console.warn('[UpdateBanner] Failed to dismiss:', e)
  }
}
</script>

<template>
  <Transition name="update-banner">
    <div v-if="status.showBanner" class="update-banner">
      <span class="update-text">{{ $t('updateBanner.text') }}</span>
      <BaseButton class="update-action" variant="subtle" size="sm" @click="handleUpdate">
        {{ $t('updateBanner.update') }}
      </BaseButton>
      <BaseButton class="remind-action" variant="subtle" size="sm" @click="handleRemindLater">
        {{ $t('updateBanner.remindLater') }}
      </BaseButton>
    </div>
  </Transition>
</template>

<style scoped>
.update-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.update-text {
  color: var(--accent);
  font-size: 13px;
  font-weight: 500;
  font-style: italic;
}

.update-action {
  color: var(--accent);
  font-weight: 600;
}

.remind-action {
  color: var(--text-muted);
}

.remind-action:hover {
  color: var(--text-secondary);
}

.update-banner-enter-active,
.update-banner-leave-active {
  transition: all 0.3s ease;
}

.update-banner-enter-from,
.update-banner-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
