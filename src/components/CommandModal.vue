<template>
  <BaseModal
    :show="show"
    :title="mode === 'add' ? $t('commandModal.addTitle') : $t('commandModal.editTitle')"
    :close-label="$t('common.close')"
    max-width="760px"
    @close="$emit('cancel')"
  >
    <div class="command-modal-form">
      <FormField :label="$t('commandModal.title')" for-id="title">
        <BaseInput
          id="title"
          ref="titleInput"
          v-model="formData.title"
          type="text"
          :placeholder="$t('commandModal.titlePlaceholder')"
          maxlength="500"
        />
      </FormField>

      <FormField :label="$t('commandModal.command')" for-id="body">
        <template #header-actions>
          <div ref="languageDropdownRef" class="language-dropdown">
            <BaseButton
              type="button"
              size="sm"
              variant="secondary"
              class="language-trigger"
              @click="languageOpen = !languageOpen"
            >
              {{ languageLabels[formData.language] || formData.language }}
              <span class="chevron" :class="{ open: languageOpen }">&#9662;</span>
            </BaseButton>
            <ul v-if="languageOpen" class="language-options">
              <li
                v-for="opt in languageOptions"
                :key="opt.value"
                :class="{ selected: formData.language === opt.value }"
                @click="selectLanguage(opt.value)"
              >
                {{ opt.label }}
              </li>
            </ul>
          </div>
        </template>

        <CodeEditor
          v-if="isCodeLanguage(formData.language)"
          v-model="formData.body"
          :language="formData.language"
          :placeholder="$t('commandModal.codePlaceholder')"
        />
        <MarkdownEditor
          v-else-if="formData.language === 'markdown'"
          v-model="formData.body"
          :placeholder="$t('commandModal.markdownPlaceholder')"
        />
        <RichTextEditor
          v-else-if="formData.language === 'richtext'"
          v-model="formData.body"
          :placeholder="$t('commandModal.richTextPlaceholder')"
        />
        <BaseTextarea
          v-else
          id="body"
          v-model="formData.body"
          class="plain-textarea"
          :placeholder="$t('commandModal.bodyPlaceholder')"
          rows="10"
        />
      </FormField>

      <FormField :label="$t('commandModal.tags')" for-id="tags">
        <div class="autocomplete-container">
          <BaseInput
            id="tags"
            ref="tagsInputRef"
            v-model="tagsInput"
            type="text"
            :placeholder="$t('commandModal.tagsPlaceholder')"
            @input="handleTagInput"
            @keydown="handleTagKeydown"
            @click="updateInlineSuggestion"
            @keyup="updateInlineSuggestion"
          />
          <div
            v-if="inlineSuggestion"
            class="inline-suggestion"
            :style="getSuggestionPosition()"
          >
            {{ inlineSuggestion }}
          </div>
        </div>
      </FormField>

      <FormField :label="$t('commandModal.description')" for-id="description">
        <MarkdownEditor
          v-model="formData.description"
          :placeholder="$t('commandModal.descriptionPlaceholder')"
        />
      </FormField>
    </div>

    <template #footer>
      <BaseButton variant="secondary" @click="$emit('cancel')">
        {{ $t('common.cancel') }}
      </BaseButton>
      <BaseButton variant="primary" @click="handleSave">
        {{ mode === 'add' ? $t('commandModal.addCommand') : $t('commandModal.saveChanges') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAllTags } from '../utils/tags'
import { getInlineSuggestion } from '../utils/autocomplete'
import BaseButton from './ui/BaseButton.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseModal from './ui/BaseModal.vue'
import BaseTextarea from './ui/BaseTextarea.vue'
import FormField from './ui/FormField.vue'
import CodeEditor from './CodeEditor.vue'
import RichTextEditor from './RichTextEditor.vue'
import MarkdownEditor from './MarkdownEditor.vue'

interface InputHandle {
  focus: () => void
  getElement: () => HTMLInputElement | null
}

interface Props {
  show: boolean
  mode: 'add' | 'edit'
  command?: {
    id: number
    title: string
    body: string
    description: string
    tags: string
    language: string
  } | null
  commands?: Array<{ tags: string }>
}

const props = withDefaults(defineProps<Props>(), {
  command: null,
  commands: () => []
})
const { t } = useI18n()

const emit = defineEmits<{
  save: [command: { title: string; body: string; description: string; tags: string; language: string }]
  cancel: []
}>()

const formData = ref({
  title: '',
  body: '',
  description: '',
  language: 'plaintext'
})

const tagsInput = ref('')
const titleInput = ref<InputHandle | null>(null)
const tagsInputRef = ref<InputHandle | null>(null)
const languageOpen = ref(false)
const languageDropdownRef = ref<HTMLElement>()

const languageOptions = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'yaml', label: 'YAML' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
]

const languageLabels = Object.fromEntries(languageOptions.map(o => [o.value, o.label]))

const selectLanguage = (value: string) => {
  formData.value.language = value
  languageOpen.value = false
}

const onClickOutsideDropdown = (e: MouseEvent) => {
  if (languageDropdownRef.value && !languageDropdownRef.value.contains(e.target as Node)) {
    languageOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutsideDropdown))
onUnmounted(() => document.removeEventListener('click', onClickOutsideDropdown))

const isCodeLanguage = (language: string): boolean => {
  const codeLangs = ['plaintext', 'yaml', 'javascript', 'typescript', 'python', 'html', 'css', 'bash', 'json', 'sql', 'go', 'rust', 'java']
  return codeLangs.includes(language)
}

const availableTags = computed(() => getAllTags(props.commands || []))
const inlineSuggestion = ref<string | null>(null)
const cursorPosition = ref(0)

watch(() => props.command, (newCommand) => {
  if (newCommand) {
    formData.value = {
      title: newCommand.title,
      body: newCommand.body,
      description: newCommand.description || '',
      language: newCommand.language || 'plaintext'
    }

    try {
      const tags = JSON.parse(newCommand.tags)
      tagsInput.value = Array.isArray(tags) ? tags.join(', ') : ''
    } catch {
      tagsInput.value = ''
    }
  } else {
    formData.value = { title: '', body: '', description: '', language: 'plaintext' }
    tagsInput.value = ''
  }
}, { immediate: true })

watch(() => props.show, (isShown) => {
  if (isShown) {
    nextTick(() => {
      titleInput.value?.focus()
    })
  } else {
    languageOpen.value = false
    if (props.mode === 'add') {
      formData.value = { title: '', body: '', description: '', language: 'plaintext' }
      tagsInput.value = ''
    }
  }
})

const getTagsInputElement = () => tagsInputRef.value?.getElement() ?? null

const updateInlineSuggestion = () => {
  const inputElement = getTagsInputElement()
  if (!inputElement) {
    inlineSuggestion.value = null
    return
  }

  const input = tagsInput.value
  const cursor = inputElement.selectionStart || 0
  cursorPosition.value = cursor

  const suggestion = getInlineSuggestion(input, cursor, availableTags.value)
  inlineSuggestion.value = suggestion.completionText
}

const handleTagInput = () => {
  updateInlineSuggestion()
}

const handleTagKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Tab' && inlineSuggestion.value) {
    event.preventDefault()

    const input = tagsInput.value
    const cursor = cursorPosition.value
    const suggestion = getInlineSuggestion(input, cursor, availableTags.value)

    if (suggestion.completionText) {
      tagsInput.value = input.substring(0, cursor) + suggestion.completionText + input.substring(cursor)

      nextTick(() => {
        const inputElement = getTagsInputElement()
        if (inputElement && suggestion.completionText) {
          const newCursorPos = cursor + suggestion.completionText.length
          inputElement.setSelectionRange(newCursorPos, newCursorPos)
          updateInlineSuggestion()
        }
      })
    }
  } else if (event.key === 'Escape') {
    inlineSuggestion.value = null
  }
}

let measureCanvas: CanvasRenderingContext2D | null = null

const getSuggestionPosition = (): { left: string; top: string } => {
  const input = getTagsInputElement()
  if (!input || !inlineSuggestion.value) {
    return { left: '0px', top: '0px' }
  }

  if (typeof input.selectionStart === 'number') {
    const computedStyle = window.getComputedStyle(input)

    if (!measureCanvas) {
      measureCanvas = document.createElement('canvas').getContext('2d')
    }

    if (measureCanvas) {
      measureCanvas.font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`

      const textBeforeCursor = input.value.substring(0, input.selectionStart)
      const textWidth = measureCanvas.measureText(textBeforeCursor).width
      const paddingLeft = parseInt(computedStyle.paddingLeft) || 12
      const paddingTop = parseInt(computedStyle.paddingTop) || 12

      return {
        left: `${paddingLeft + textWidth}px`,
        top: `${paddingTop + 1}px`
      }
    }
  }

  return { left: '0px', top: '0px' }
}

const handleSave = () => {
  if (!formData.value.title.trim() || !formData.value.body.trim()) {
    alert(t('commandModal.required'))
    return
  }

  const tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, 12)

  emit('save', {
    title: formData.value.title.trim(),
    body: formData.value.body.trim(),
    description: formData.value.description.trim(),
    tags: JSON.stringify(tags),
    language: formData.value.language
  })
}
</script>

<style scoped>
.command-modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.language-dropdown {
  position: relative;
}

.language-trigger {
  min-height: 28px;
  padding: 4px 8px;
  color: var(--text-secondary);
  font-size: 11px;
}

.chevron {
  font-size: 9px;
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(180deg);
}

.language-options {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 0;
  list-style: none;
  min-width: 140px;
  max-height: 260px;
  overflow-y: auto;
  z-index: var(--z-dropdown);
  box-shadow: 0 4px 12px var(--shadow);
}

.language-options li {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.language-options li:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.language-options li.selected {
  color: var(--accent);
}

.autocomplete-container {
  position: relative;
  width: 100%;
}

.inline-suggestion {
  position: absolute;
  pointer-events: none;
  color: var(--text-muted);
  font-size: 14px;
  font-family: inherit;
  white-space: nowrap;
  z-index: 1;
}

.plain-textarea {
  min-height: 200px;
  font-family: Monaco, Menlo, "Ubuntu Mono", Consolas, monospace;
}
</style>
