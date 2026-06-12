<template>
  <BaseModal
    :show="show"
    :title="$t('duplicateModal.title')"
    :close-label="$t('common.close')"
    top-layer
    max-width="500px"
    body-class="duplicate-body"
    @close="$emit('cancel')"
  >
    <div class="duplicate-icon">⚠️</div>
    <p class="info-text">
      {{ $t('duplicateModal.found', { count: duplicates.length, plural: duplicates.length > 1 ? 's' : '' }) }}
    </p>
    <p class="sub-text">
      {{ $t('duplicateModal.prompt') }}
    </p>

    <template #footer>
      <BaseButton variant="secondary" @click="$emit('cancel')">
        {{ $t('duplicateModal.cancelImport') }}
      </BaseButton>
      <div class="spacer"></div>
      <BaseButton variant="secondary" @click="handleChoice('skip')">
        {{ $t('duplicateModal.keepExisting') }}
      </BaseButton>
      <BaseButton variant="primary" @click="handleChoice('replace')">
        {{ $t('duplicateModal.replaceWithNew') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from '../../ui/BaseButton.vue'
import BaseModal from '../../ui/BaseModal.vue'
import type { DuplicateMatch } from '../../../utils/importExport'

interface Props {
  show: boolean
  duplicates: DuplicateMatch[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  apply: [actions: ('skip' | 'replace')[]]
}>()

function handleChoice(choice: 'skip' | 'replace') {
  const actions = new Array(props.duplicates.length).fill(choice) as ('skip' | 'replace')[]
  emit('apply', actions)
}
</script>

<style scoped>
:deep(.duplicate-body) {
  padding: 40px 32px;
  text-align: center;
}

.duplicate-icon {
  margin-bottom: 16px;
  font-size: 48px;
}

.info-text {
  margin: 0 0 12px 0;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.5;
}

.sub-text {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 14px;
}

.spacer {
  flex: 1;
}
</style>
