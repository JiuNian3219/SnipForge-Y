<template>
  <select
    class="base-select"
    :value="modelValue"
    :disabled="disabled"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  disabled?: boolean
}>(), {
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.base-select {
  min-width: 170px;
  padding: 8px 36px 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.base-select:hover:not(:disabled) {
  border-color: var(--border-hover);
  background: var(--bg-surface);
}

.base-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.base-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
