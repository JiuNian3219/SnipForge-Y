<template>
  <div class="rich-text-editor">
    <!-- Toolbar -->
    <div v-if="editor" class="toolbar">
      <ToolbarButton
        @click="editor.chain().focus().toggleBold().run()"
        :active="editor.isActive('bold')"
        :title="$t('editor.bold')"
      >
        <Bold :size="16" />
      </ToolbarButton>
      <ToolbarButton
        @click="editor.chain().focus().toggleItalic().run()"
        :active="editor.isActive('italic')"
        :title="$t('editor.italic')"
      >
        <Italic :size="16" />
      </ToolbarButton>
      <ToolbarButton
        @click="editor.chain().focus().toggleStrike().run()"
        :active="editor.isActive('strike')"
        :title="$t('editor.strikethrough')"
      >
        <Strikethrough :size="16" />
      </ToolbarButton>
      <div class="divider"></div>
      <ToolbarButton
        @click="editor.chain().focus().toggleBulletList().run()"
        :active="editor.isActive('bulletList')"
        :title="$t('editor.bulletList')"
      >
        <List :size="16" />
      </ToolbarButton>
      <ToolbarButton
        @click="editor.chain().focus().toggleOrderedList().run()"
        :active="editor.isActive('orderedList')"
        :title="$t('editor.numberedList')"
      >
        <ListOrdered :size="16" />
      </ToolbarButton>
      <ToolbarButton
        @click="editor.chain().focus().toggleTaskList().run()"
        :active="editor.isActive('taskList')"
        :title="$t('editor.taskList')"
      >
        <ListTodo :size="16" />
      </ToolbarButton>
      <div class="divider"></div>
      <ToolbarButton
        @click="openLinkDialog"
        :active="editor.isActive('link')"
        :title="$t('editor.link')"
      >
        <LinkIcon :size="16" />
      </ToolbarButton>
      <ToolbarButton
        @click="imageFileInput?.click()"
        :title="$t('editor.image')"
      >
        <ImageIcon :size="16" />
      </ToolbarButton>
      <input
        ref="imageFileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleImageUpload"
      />
    </div>

    <!-- Editor -->
    <EditorContent :editor="editor" class="editor-content" />

    <BaseModal
      :show="showLinkDialog"
      :title="$t('editor.link')"
      :close-label="$t('common.close')"
      max-width="420px"
      @close="closeLinkDialog"
    >
      <div class="link-input-wrapper">
        <BaseInput
          ref="linkInput"
          v-model="linkUrl"
          class="link-input"
          type="text"
          :placeholder="$t('editor.linkPlaceholder')"
          @keyup.enter="saveLink"
          @keyup.esc="closeLinkDialog"
        />
        <IconButton
          v-if="linkUrl"
          class="clear-link-button"
          :title="$t('editor.clearLink')"
          :aria-label="$t('editor.clearLink')"
          @click="linkUrl = ''"
        >
            <X :size="16" />
        </IconButton>
      </div>

      <template #footer>
        <BaseButton variant="secondary" @click="closeLinkDialog">
          {{ $t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" @click="saveLink">
          {{ $t('common.save') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'

const VAR_REGEXP = /\{\{\s*[a-zA-Z0-9][a-zA-Z0-9 _-]*\s*\}\}/g

const variableHighlight = Extension.create({
  name: 'variableHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('variableHighlight'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              VAR_REGEXP.lastIndex = 0
              let match
              while ((match = VAR_REGEXP.exec(node.text)) !== null) {
                decorations.push(
                  Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                    class: 'snipforge-variable'
                  })
                )
              }
            })
            return DecorationSet.create(state.doc, decorations)
          }
        }
      })
    ]
  }
})
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Strikethrough, List, ListOrdered, ListTodo, Link as LinkIcon, X, Image as ImageIcon } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseModal from './ui/BaseModal.vue'
import IconButton from './ui/IconButton.vue'
import ToolbarButton from './ui/ToolbarButton.vue'

interface InputHandle {
  focus: () => void
  select: () => void
}

interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Start typing...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Image file input
const imageFileInput = ref<HTMLInputElement>()

// Resize image to max 1200px and return as PNG data URI
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new window.Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 1200
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > MAX || h > MAX) {
          const ratio = Math.min(MAX / w, MAX / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Link dialog state
const showLinkDialog = ref(false)
const linkUrl = ref('')
const linkInput = ref<InputHandle | null>(null)

const editor = useEditor({
  extensions: [
    variableHighlight,
    StarterKit, // Includes Link extension by default
    Image.configure({
      allowBase64: true,
      HTMLAttributes: {
        class: 'editor-image'
      }
    }),
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    })
  ],
  content: props.modelValue,
  editorProps: {
    attributes: { class: 'prose prose-invert' },
    handlePaste: (view, event) => {
      const items = Array.from(event.clipboardData?.items ?? [])
      // Only intercept if there's no rich HTML content — let TipTap handle regular pastes
      const hasHtml = items.some(item => item.type === 'text/html')
      if (hasHtml) return false
      const imageItem = items.find(item => item.type.startsWith('image/'))
      if (!imageItem) return false
      const file = imageItem.getAsFile()
      if (!file) return false
      processImage(file).then(src => {
        const node = view.state.schema.nodes.image?.create({ src })
        if (node) view.dispatch(view.state.tr.replaceSelectionWith(node))
      })
      return true
    },
    handleDrop: (view, event, _slice, moved) => {
      if (moved) return false
      const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'))
      if (!files.length) return false
      event.preventDefault()
      const coords = { left: event.clientX, top: event.clientY }
      files.forEach(file => {
        processImage(file).then(src => {
          const node = view.state.schema.nodes.image?.create({ src })
          if (!node) return
          const pos = view.posAtCoords(coords)
          view.dispatch(view.state.tr.insert(pos?.pos ?? view.state.selection.from, node))
        })
      })
      return true
    }
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue, { emitUpdate: false })
  }
})

// Link dialog functions
const openLinkDialog = () => {
  if (!editor.value) return

  // Get current link if editing
  const previousUrl = editor.value.getAttributes('link').href
  linkUrl.value = previousUrl || ''
  showLinkDialog.value = true

  // Focus input after modal opens
  nextTick(() => {
    linkInput.value?.focus()
    linkInput.value?.select()
  })
}

const closeLinkDialog = () => {
  showLinkDialog.value = false
  linkUrl.value = ''
}

const handleImageUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !editor.value) return
  const src = await processImage(file)
  editor.value.chain().focus().setImage({ src }).run()
  ;(e.target as HTMLInputElement).value = ''
}

// Validate URL to prevent javascript:/data:/vbscript: injection
const isUrlSafe = (url: string): boolean => {
  const dangerous = /^\s*(javascript|data|vbscript)\s*:/i
  if (dangerous.test(url)) return false
  try {
    const parsed = new URL(url)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    // Partial URLs (e.g. "example.com") throw — allow if not dangerous
    return true
  }
}

const saveLink = () => {
  if (!editor.value) return

  const url = linkUrl.value.trim()

  if (url === '') {
    // Empty URL = remove link
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
  } else if (isUrlSafe(url)) {
    // Set link
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  // Blocked URLs silently close the dialog

  closeLinkDialog()
}

onUnmounted(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-input);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.divider {
  width: 1px;
  height: 24px;
  background-color: var(--border);
  margin: 0 4px;
}

.editor-content {
  padding: 12px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.7;
  min-height: 180px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: var(--text-muted);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.editor-content :deep(.ProseMirror h1),
.editor-content :deep(.ProseMirror h2),
.editor-content :deep(.ProseMirror h3) {
  color: var(--text-primary);
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 12px;
  line-height: 1.3;
}

.editor-content :deep(.ProseMirror h1) {
  font-size: 2em;
  margin-top: 0;
}

.editor-content :deep(.ProseMirror h2) {
  font-size: 1.5em;
}

.editor-content :deep(.ProseMirror h3) {
  font-size: 1.25em;
}

.editor-content :deep(.ProseMirror p) {
  margin: 12px 0;
}

.editor-content :deep(.ProseMirror a) {
  color: var(--accent);
  text-decoration: underline;
  cursor: pointer;
}

.editor-content :deep(.ProseMirror a:hover) {
  color: var(--accent-light);
}

.editor-content :deep(.ProseMirror strong) {
  font-weight: 600;
}

.editor-content :deep(.ProseMirror em) {
  font-style: italic;
}

.editor-content :deep(.ProseMirror s) {
  text-decoration: line-through;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.editor-content :deep(.ProseMirror li) {
  margin: 4px 0;
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding: 0;
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] p) {
  margin: 0;
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] li > label) {
  flex: 0 0 auto;
  margin-right: 8px;
  margin-top: 6px;
  user-select: none;
  display: flex;
  align-items: center;
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]) {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  margin: 0;
  padding: 0;
  border: 2px solid var(--text-muted);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  background-color: transparent;
  transition: all 0.2s;
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]:hover) {
  border-color: var(--text-placeholder);
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]:checked) {
  background-color: var(--accent);
  border-color: var(--accent);
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]:checked::after) {
  content: '';
  position: absolute;
  left: 3px;
  top: 0px;
  width: 4px;
  height: 8px;
  border: solid var(--text-primary);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.editor-content :deep(.ProseMirror ul[data-type="taskList"] li > div) {
  flex: 1 1 auto;
}


.editor-content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

.editor-content :deep(.snipforge-variable) {
  color: #e8a948;
  font-weight: 500;
}

.editor-content :deep(.ProseMirror code) {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 3px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9em;
  color: #ff9966;
}

.editor-content :deep(.ProseMirror pre) {
  background-color: var(--bg-deep);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  border: 1px solid var(--bg-surface);
}

.editor-content :deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
  color: #d4d4d4;
}

.editor-content :deep(.ProseMirror blockquote) {
  border-left: 4px solid var(--border-hover);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--text-tertiary);
  font-style: italic;
}

.link-input-wrapper {
  position: relative;
}

.link-input {
  padding-right: 44px;
}

.clear-link-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
