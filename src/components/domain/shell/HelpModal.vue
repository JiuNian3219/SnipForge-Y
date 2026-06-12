<template>
  <BaseModal
    :show="show"
    :title="$t('app.helpTitle')"
    :close-label="$t('common.close')"
    @close="$emit('cancel')"
  >
    <div v-html="markdownContent" class="markdown-content help-content" @click="handleLinkClick"></div>

    <template #footer>
      <BaseButton variant="primary" @click="$emit('cancel')">
        {{ $t('common.close') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import BaseButton from '../../ui/BaseButton.vue'
import BaseModal from '../../ui/BaseModal.vue'
import helpMarkdown from '../../../assets/help.md?raw'

interface Props {
  show: boolean
}

defineProps<Props>()

defineEmits<{
  cancel: []
}>()

const markdownContent = computed(() => {
  const isMac = navigator.userAgent.toLowerCase().includes('mac')
  const processed = helpMarkdown
    .replace('**⌘⇧Space** (Mac) / **Ctrl⇧Space** (Windows/Linux)', isMac ? '**⌘⇧Space**' : '**Ctrl⇧Space**')
    .replace('**⌘F** (Mac) / **Ctrl+F** (Windows/Linux)', isMac ? '**⌘F**' : '**Ctrl+F**')

  return DOMPurify.sanitize(marked.parse(processed, { async: false }) as string)
})

async function handleLinkClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.tagName !== 'A') return

  event.preventDefault()
  let url = (target as HTMLAnchorElement).href
  if (url.includes('localhost:5173/')) {
    url = url.split('localhost:5173/')[1]
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
  }
  if (url) {
    await (window as any).electronAPI.shell.openExternal(url)
  }
}
</script>

<style scoped>
.help-content {
  line-height: 1.6;
}

.help-content :deep(h1) {
  margin: 0 0 24px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.help-content :deep(h2) {
  margin: 24px 0 12px 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.help-content :deep(h2:first-of-type) {
  margin-top: 0;
}

.help-content :deep(ul) {
  margin: 0 0 24px 0;
  padding-left: 0;
  list-style: none;
}

.help-content :deep(li) {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.help-content :deep(li > strong:first-child) {
  min-width: 20px;
  flex-shrink: 0;
  padding: 2px 6px;
  border: 1px solid var(--border-hover);
  border-radius: 4px;
  background: var(--border);
  color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
}
</style>
