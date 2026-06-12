<template>
  <div
    v-if="show"
    class="base-modal-overlay"
    :class="{ 'base-modal-overlay--top': topLayer }"
    @click.self="handleBackdropClick"
  >
    <div class="base-modal" :class="contentClass" :style="{ maxWidth }" @click.stop>
      <header v-if="title || $slots.header" class="base-modal__header">
        <slot name="header">
          <h2>{{ title }}</h2>
          <IconButton :title="closeLabel" :aria-label="closeLabel" @click="$emit('close')">
            <X :size="18" />
          </IconButton>
        </slot>
      </header>

      <section class="base-modal__body" :class="bodyClass">
        <slot />
      </section>

      <footer v-if="$slots.footer" class="base-modal__footer" :class="footerClass">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import IconButton from './IconButton.vue'

const props = withDefaults(defineProps<{
  show: boolean
  title?: string
  closeLabel?: string
  closeOnBackdrop?: boolean
  topLayer?: boolean
  maxWidth?: string
  contentClass?: string
  bodyClass?: string
  footerClass?: string
}>(), {
  title: '',
  closeLabel: 'Close',
  closeOnBackdrop: true,
  topLayer: false,
  maxWidth: '600px',
  contentClass: '',
  bodyClass: '',
  footerClass: '',
})

const emit = defineEmits<{
  close: []
}>()

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}
</script>

<style scoped>
.base-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--overlay);
  -webkit-app-region: no-drag;
}

.base-modal-overlay--top {
  z-index: var(--z-modal-top);
}

.base-modal {
  width: min(90vw, 100%);
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 10px 30px var(--shadow);
}

.base-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.base-modal__header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.base-modal__body {
  padding: 24px;
}

.base-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border);
}
</style>
