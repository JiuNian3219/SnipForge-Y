<template>
  <textarea
    ref="textareaRef"
    v-bind="$attrs"
    class="base-textarea"
    :id="id"
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    :maxlength="maxlength"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  inheritAttrs: false,
})

withDefaults(defineProps<{
  modelValue: string
  id?: string
  placeholder?: string
  rows?: string | number
  disabled?: boolean
  maxlength?: string | number
}>(), {
  id: undefined,
  placeholder: '',
  rows: 4,
  disabled: false,
  maxlength: undefined,
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

defineExpose({
  focus: () => textareaRef.value?.focus(),
  select: () => textareaRef.value?.select(),
  getElement: () => textareaRef.value,
  element: textareaRef,
})
</script>

<style scoped>
.base-textarea {
  width: 100%;
  min-height: 96px;
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
  line-height: 1.6;
  resize: vertical;
}

.base-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.base-textarea::placeholder {
  color: var(--text-tertiary);
}

.base-textarea:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
