<template>
  <button
    v-bind="$attrs"
    class="toolbar-button"
    :class="{ 'toolbar-button--active': active }"
    type="button"
    :disabled="disabled"
    :title="title"
    :aria-label="ariaLabel || title"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

withDefaults(defineProps<{
  active?: boolean
  disabled?: boolean
  title?: string
  ariaLabel?: string
}>(), {
  active: false,
  disabled: false,
  title: '',
  ariaLabel: '',
})
</script>

<style scoped>
.toolbar-button {
  width: 32px;
  height: 32px;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
}

.toolbar-button:hover:not(:disabled),
.toolbar-button--active {
  background: var(--bg-hover);
  border-color: var(--border);
  color: var(--accent);
}

.toolbar-button:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.toolbar-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
