<template>
  <input
    ref="inputRef"
    class="base-input"
    :id="id"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{
  modelValue: string
  id?: string
  type?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  id: undefined,
  type: 'text',
  placeholder: '',
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({
  focus: () => inputRef.value?.focus(),
  select: () => inputRef.value?.select(),
  element: inputRef,
})
</script>

<style scoped>
.base-input {
  width: 100%;
  box-sizing: border-box;
  display: block;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
}

.base-input:focus {
  outline: none;
  border-color: var(--accent);
}

.base-input::placeholder {
  color: var(--text-tertiary);
}

.base-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
