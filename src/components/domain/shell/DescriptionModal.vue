<template>
  <BaseModal
    :show="show"
    :title="title"
    :close-label="$t('common.close')"
    @close="$emit('cancel')"
  >
    <div v-html="renderedDescription" class="markdown-content" @click="handleLinkClick"></div>

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
import { useI18n } from 'vue-i18n'
import BaseButton from '../../ui/BaseButton.vue'
import BaseModal from '../../ui/BaseModal.vue'

interface Props {
  show: boolean
  title: string
  description: string
}

const props = defineProps<Props>()
const { t } = useI18n()

defineEmits<{
  cancel: []
}>()

marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedDescription = computed(() => {
  const rawHtml = marked.parse(props.description || '', { async: false })
  return DOMPurify.sanitize(rawHtml)
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

  if (url && confirm(t('descriptionModal.externalLinkConfirm', { url }))) {
    await (window as any).electronAPI.shell.openExternal(url)
  }
}
</script>
