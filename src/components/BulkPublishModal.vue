<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content bulk-publish-modal">
      <div class="modal-header">
        <h2>Bulk Publish</h2>
        <button class="close-button" @click="handleClose" :disabled="isPublishing">×</button>
      </div>

      <div class="modal-body">
        <!-- Library picker -->
        <div class="bp-library-picker" v-if="libraries.length > 1">
          <label>Target library</label>
          <select v-model="selectedLibraryId" :disabled="isPublishing">
            <option v-for="lib in libraries" :key="lib.id" :value="lib.id">
              {{ lib.name }} ({{ lib.github_repo }})
            </option>
          </select>
        </div>
        <div class="bp-library-picker" v-else-if="libraries.length === 1">
          <label>Target library</label>
          <div class="bp-library-single">{{ libraries[0].name }} ({{ libraries[0].github_repo }})</div>
        </div>

        <!-- Select all / count -->
        <div class="bp-selection-bar">
          <label class="bp-select-all">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected && !allSelected"
              @change="toggleSelectAll"
              :disabled="isPublishing"
            />
            <span v-if="selectedCount === 0">Select all ({{ localCommands.length }})</span>
            <span v-else>{{ selectedCount }} of {{ localCommands.length }} selected</span>
          </label>
        </div>

        <!-- Command list -->
        <div class="bp-command-list">
          <label
            v-for="cmd in localCommands"
            :key="cmd.id"
            class="bp-command-item"
            :class="{ 'bp-published': getResult(cmd.id)?.success, 'bp-failed': getResult(cmd.id)?.success === false }"
          >
            <input
              type="checkbox"
              :checked="selectedIds.has(cmd.id)"
              @change="toggleCommand(cmd.id)"
              :disabled="isPublishing"
            />
            <div class="bp-command-info">
              <span class="bp-command-title">{{ cmd.title }}</span>
              <span class="bp-command-body">{{ cmd.body.substring(0, 80) }}{{ cmd.body.length > 80 ? '...' : '' }}</span>
            </div>
            <span v-if="getResult(cmd.id)?.success" class="bp-status bp-status-ok">Done</span>
            <span v-else-if="getResult(cmd.id)?.success === false" class="bp-status bp-status-err" :title="getResult(cmd.id)?.error">Failed</span>
          </label>
          <div v-if="localCommands.length === 0" class="bp-empty">
            No local commands to publish.
          </div>
        </div>

        <!-- Progress bar -->
        <div v-if="isPublishing" class="bp-progress">
          <div class="bp-progress-bar">
            <div class="bp-progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <span class="bp-progress-text">{{ progressCurrent }} / {{ progressTotal }}</span>
        </div>

        <!-- Results summary -->
        <div v-if="isDone" class="bp-summary">
          <span class="bp-summary-ok" v-if="succeededCount > 0">{{ succeededCount }} published</span>
          <span class="bp-summary-err" v-if="failedCount > 0">{{ failedCount }} failed</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="bp-cancel" @click="handleClose" :disabled="isPublishing">
          {{ isDone ? 'Close' : 'Cancel' }}
        </button>
        <button
          v-if="!isDone"
          class="bp-publish-btn"
          @click="startPublish"
          :disabled="selectedCount === 0 || isPublishing || !selectedLibraryId"
        >
          {{ isPublishing ? 'Publishing...' : `Publish ${selectedCount} command${selectedCount !== 1 ? 's' : ''}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Library, CommandWithTags, BulkPublishResult } from '../../shared/types'

interface Props {
  show: boolean
  commands: CommandWithTags[]
  libraries: Library[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  done: []
}>()

const selectedIds = ref<Set<number>>(new Set())
const selectedLibraryId = ref<number | null>(null)
const isPublishing = ref(false)
const isDone = ref(false)
const results = ref<BulkPublishResult[]>([])
const progressCurrent = ref(0)
const progressTotal = ref(0)

// Only show local commands
const localCommands = computed(() =>
  props.commands.filter(c => c.source === 'local')
)

const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() =>
  localCommands.value.length > 0 && selectedIds.value.size === localCommands.value.length
)
const someSelected = computed(() => selectedIds.value.size > 0)

const progressPercent = computed(() =>
  progressTotal.value > 0 ? Math.round((progressCurrent.value / progressTotal.value) * 100) : 0
)

const succeededCount = computed(() => results.value.filter(r => r.success).length)
const failedCount = computed(() => results.value.filter(r => !r.success).length)

function getResult(commandId: number): BulkPublishResult | undefined {
  return results.value.find(r => r.commandId === commandId)
}

function toggleCommand(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(localCommands.value.map(c => c.id))
  }
}

// Auto-select library if only one
watch(() => props.libraries, (libs) => {
  if (libs.length === 1) {
    selectedLibraryId.value = libs[0].id
  } else if (libs.length > 1 && !selectedLibraryId.value) {
    selectedLibraryId.value = libs[0].id
  }
}, { immediate: true })

// Reset state when modal opens
watch(() => props.show, (visible) => {
  if (visible) {
    selectedIds.value = new Set()
    isPublishing.value = false
    isDone.value = false
    results.value = []
    progressCurrent.value = 0
    progressTotal.value = 0
  }
})

// Listen for progress updates from main process
let cleanupProgress: (() => void) | null = null

watch(() => props.show, (visible) => {
  if (visible) {
    cleanupProgress = window.electronAPI.library.onBulkPublishProgress((data) => {
      progressCurrent.value = data.index + 1
      progressTotal.value = data.total
      results.value = [...results.value, data.result]
    })
  } else if (cleanupProgress) {
    cleanupProgress()
    cleanupProgress = null
  }
})

onUnmounted(() => {
  if (cleanupProgress) {
    cleanupProgress()
  }
})

async function startPublish() {
  if (!selectedLibraryId.value || selectedCount.value === 0) return

  isPublishing.value = true
  isDone.value = false
  results.value = []
  progressCurrent.value = 0
  progressTotal.value = selectedCount.value

  try {
    const commandIds = Array.from(selectedIds.value)
    const response = await window.electronAPI.library.bulkPublish(selectedLibraryId.value, commandIds)
    if (!response.success && response.error) {
      results.value = [{ commandId: 0, title: '', success: false, error: response.error }]
    }
  } catch (error) {
    console.error('Bulk publish error:', error)
  } finally {
    isPublishing.value = false
    isDone.value = true
  }
}

function handleClose() {
  if (isPublishing.value) return
  if (isDone.value) {
    emit('done')
  } else {
    emit('cancel')
  }
}
</script>

<style scoped>
.bulk-publish-modal {
  max-width: 520px;
  width: 90vw;
}

.bp-library-picker {
  margin-bottom: 12px;
}

.bp-library-picker label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.bp-library-picker select {
  width: 100%;
  padding: 8px 10px;
  padding-right: 28px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.bp-library-picker select:focus {
  border-color: var(--accent);
}

.bp-library-picker select option {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.bp-library-single {
  padding: 8px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
}

.bp-selection-bar {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.bp-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.bp-select-all input[type="checkbox"] {
  accent-color: var(--accent);
}

.bp-command-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bp-command-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.bp-command-item:hover {
  background: var(--bg-hover);
}

.bp-command-item input[type="checkbox"] {
  accent-color: var(--accent);
  flex-shrink: 0;
}

.bp-command-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bp-command-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bp-command-body {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: 'SF Mono', 'Fira Code', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bp-published {
  background: rgba(34, 197, 94, 0.06);
}

.bp-failed {
  background: rgba(239, 68, 68, 0.06);
}

.bp-status {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 4px;
}

.bp-status-ok {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}

.bp-status-err {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.bp-progress {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.bp-progress-bar {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.bp-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.2s;
}

.bp-progress-text {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.bp-summary {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  font-size: 13px;
  font-weight: 500;
}

.bp-summary-ok {
  color: #22c55e;
}

.bp-summary-err {
  color: #ef4444;
}

.bp-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.bp-cancel {
  padding: 8px 16px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.bp-cancel:hover:not(:disabled) {
  background: var(--bg-surface);
}

.bp-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bp-publish-btn {
  padding: 8px 16px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}

.bp-publish-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.bp-publish-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
