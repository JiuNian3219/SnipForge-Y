<template>
  <div class="command-list">
    <VList
      v-if="commands.length > 0"
      class="list"
      :data="commands"
    >
      <template #default="{ item: command }">
        <div
          class="command-list-item"
          :class="{
            selected: isSelected(command.id),
          }"
          @click="$emit('toggle', command.id)"
        >
          <div class="checkbox-container">
            <BaseCheckbox
              :model-value="isSelected(command.id)"
              @click.stop="$emit('toggle', command.id)"
            />
          </div>

          <div class="command-details">
            <div class="command-title-row">
              <div class="command-title">{{ command.title }}</div>
              <span v-if="command.language" class="command-language">{{ command.language }}</span>
            </div>
            <div v-if="command.description" class="command-description">
              {{ command.description }}
            </div>
            <div class="command-meta">
              <span v-if="command.tagsArray.length > 0" class="command-tags">
                {{ command.tagsArray.join(', ') }}
              </span>
              <span class="command-updated">Updated {{ formatTimestamp(command.updated_at) }}</span>
            </div>
          </div>
        </div>
      </template>
    </VList>

    <EmptyState v-else :title="emptyTitle" :message="emptyMessage" />
  </div>
</template>

<script setup lang="ts">
import { VList } from 'virtua/vue'
import BaseCheckbox from './ui/BaseCheckbox.vue'
import EmptyState from './ui/EmptyState.vue'

interface Command {
  id: number
  title: string
  body: string
  description?: string
  tags: string
  tagsArray: string[]
  tagsNormalized: string[]
  language?: string
  created_at: string
  updated_at: string
}

interface Props {
  commands: Command[]
  selectedIds: number[]
  emptyTitle?: string
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  emptyTitle: 'No commands here yet',
  emptyMessage: 'Commands in this library will show up here.'
})

defineEmits<{
  toggle: [id: number]
}>()

function isSelected(id: number): boolean {
  return props.selectedIds.includes(id)
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString()
}
</script>

<style scoped>
.command-list {
  background: color-mix(in srgb, var(--bg-input) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list {
  flex: 1;
  overflow: hidden;
}

.command-list-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s, border-color 0.2s;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
}

.command-list-item:last-child {
  border-bottom: none;
}

.command-list-item:hover {
  background: color-mix(in srgb, var(--bg-hover) 72%, transparent);
}

.command-list-item.selected {
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-surface));
  box-shadow:
    inset 3px 0 0 var(--accent),
    inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
}

.checkbox-container {
  display: flex;
  align-items: center;
  padding-top: 2px;
  flex-shrink: 0;
}

.command-details {
  flex: 1;
  min-width: 0;
}

.command-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.command-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-language {
  flex-shrink: 0;
  text-transform: capitalize;
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
}

.command-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.command-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.command-tags,
.command-updated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-list-item.selected .command-title,
.command-list-item.selected .command-updated {
  color: var(--text-primary);
}

@media (max-width: 900px) {
  .command-meta,
  .command-title-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
