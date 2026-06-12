<template>
  <input
    ref="checkboxRef"
    v-bind="$attrs"
    class="base-checkbox"
    type="checkbox"
    :checked="modelValue"
    :disabled="disabled"
    @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
  />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  indeterminate?: boolean
}>(), {
  disabled: false,
  indeterminate: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const checkboxRef = ref<HTMLInputElement | null>(null)

watchEffect(() => {
  if (checkboxRef.value) {
    checkboxRef.value.indeterminate = props.indeterminate
  }
})
</script>

<style scoped>
.base-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border);
  border-radius: 3px;
  background: var(--bg-surface);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background-color 0.15s, border-color 0.15s, opacity 0.15s;
}

.base-checkbox:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.base-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4.5px;
  top: 1.5px;
  width: 4px;
  height: 8px;
  border: solid var(--bg-app);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.base-checkbox:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.base-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
