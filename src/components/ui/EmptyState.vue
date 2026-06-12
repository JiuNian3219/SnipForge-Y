<template>
  <div class="empty-state">
    <div class="empty-state__title">{{ title }}</div>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  message?: string
}>()
</script>

<style scoped>
.empty-state {
  min-height: 220px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.empty-state__title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.empty-state__message {
  margin: 0;
  max-width: 320px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
</style>
