<template>
  <div class="tag-selector">
    <div class="tag-selector-header">
      <span>{{ displayTitle }}</span>
      <BaseButton size="sm" variant="secondary" @click="$emit('clear-all')">
        {{ $t('tagSelector.clearAll') }}
      </BaseButton>
    </div>

    <div class="tag-search">
      <BaseInput
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="$t('tagSelector.searchPlaceholder')"
      />
    </div>

    <VList
      v-if="sortedTags.length > 0"
      class="tag-list"
      :data="sortedTags"
    >
      <template #default="{ item: tag }">
        <div
          class="tag-item"
          :class="{ selected: isSelected(tag) }"
          @click="$emit('toggle', tag)"
        >
          <span class="tag-name">{{ tag }}</span>
          <Check v-if="isSelected(tag)" class="checkmark" :size="16" />
        </div>
      </template>
    </VList>

    <EmptyState
      v-else
      class="tag-empty-state"
      :title="searchQuery ? $t('tagSelector.noMatching') : $t('tagSelector.noTags')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick } from 'vue'
import { VList } from 'virtua/vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseInput from './ui/BaseInput.vue'
import EmptyState from './ui/EmptyState.vue'

interface InputHandle {
  focus: () => void
}

interface Props {
  availableTags: string[]
  selectedTags: string[]
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: ''
})

const { t } = useI18n()

defineEmits<{
  toggle: [tag: string]
  'clear-all': []
}>()

const searchQuery = ref('')
const searchInputRef = ref<InputHandle | null>(null)
const displayTitle = computed(() => props.title || t('tagSelector.selectTags'))

onMounted(() => {
  nextTick(() => searchInputRef.value?.focus())
})

const sortedTags = computed(() => {
  const query = searchQuery.value.toLowerCase()
  const filtered = query
    ? props.availableTags.filter(tag => tag.toLowerCase().includes(query))
    : props.availableTags
  return [...filtered].sort()
})

const isSelected = (tag: string): boolean => {
  return props.selectedTags.includes(tag)
}
</script>

<style scoped>
.tag-selector {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 400px;
}

.tag-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.tag-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tag-list {
  flex: 1;
  overflow: hidden;
  min-height: 200px;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: var(--text-secondary);
}

.tag-item:hover {
  background: var(--bg-hover);
}

.tag-item.selected {
  background: var(--accent);
  color: var(--text-primary);
}

.tag-name {
  flex: 1;
}

.checkmark {
  color: var(--text-primary);
  margin-left: 8px;
  flex-shrink: 0;
}

.tag-empty-state {
  min-height: 160px;
}
</style>
