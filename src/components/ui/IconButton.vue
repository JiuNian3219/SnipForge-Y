<template>
  <button
    class="icon-button"
    :class="[`icon-button--${variant}`, `icon-button--${size}`]"
    type="button"
    :disabled="disabled"
    :title="title"
    :aria-label="ariaLabel || title"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'subtle' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
  title?: string
  ariaLabel?: string
  disabled?: boolean
}>(), {
  variant: 'subtle',
  size: 'md',
  title: '',
  ariaLabel: '',
  disabled: false,
})
</script>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
}

.icon-button--sm {
  width: 28px;
  height: 28px;
  padding: 0;
}

.icon-button--md {
  width: 32px;
  height: 32px;
  padding: 0;
}

.icon-button--subtle {
  background: transparent;
}

.icon-button--secondary {
  background: var(--bg-surface);
  border-color: var(--border);
}

.icon-button--danger {
  background: transparent;
  color: var(--text-tertiary);
}

.icon-button:hover:not(:disabled) {
  background: var(--border);
  color: var(--text-primary);
}

.icon-button--danger:hover:not(:disabled) {
  background: var(--danger);
  border-color: var(--danger);
}

.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.icon-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--accent);
}
</style>
