<template>
  <button
    class="base-button"
    :class="[
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--icon-only': iconOnly }
    ]"
    :type="type"
    :disabled="disabled"
  >
    <span v-if="$slots.icon" class="base-button__icon">
      <slot name="icon" />
    </span>
    <span v-if="$slots.default" class="base-button__label">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'subtle' | 'danger'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  iconOnly?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  disabled: false,
  iconOnly: false,
})
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-primary);
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
}

.base-button--sm {
  min-height: 28px;
  padding: 4px 10px;
  font-size: 12px;
}

.base-button--md {
  min-height: 38px;
  padding: 10px 20px;
  font-size: 14px;
}

.base-button--primary {
  background: var(--accent);
  border-color: var(--accent);
}

.base-button--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.base-button--secondary {
  background: var(--bg-surface);
  border-color: var(--border);
}

.base-button--secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.base-button--subtle {
  background: transparent;
  color: var(--text-secondary);
}

.base-button--subtle:hover:not(:disabled) {
  background: var(--accent-glow);
  color: var(--text-primary);
}

.base-button--danger {
  background: var(--danger);
  border-color: var(--danger);
}

.base-button--danger:hover:not(:disabled) {
  background: #b71c1c;
  border-color: #b71c1c;
}

.base-button--icon-only {
  width: 32px;
  min-width: 32px;
  padding: 0;
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.base-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--accent);
}

.base-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
