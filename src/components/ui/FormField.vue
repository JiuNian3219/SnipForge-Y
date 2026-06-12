<template>
  <div class="form-field">
    <div class="form-field__header">
      <label v-if="label" class="form-field__label" :for="forId">{{ label }}</label>
      <slot name="header-actions" />
    </div>
    <p v-if="description" class="form-field__description">{{ description }}</p>
    <slot />
    <p v-if="error" class="form-field__error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  forId?: string
  description?: string
  error?: string
}>()
</script>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.form-field__label {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.form-field__description,
.form-field__error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.form-field__description {
  color: var(--text-secondary);
}

.form-field__error {
  color: var(--danger);
}
</style>
