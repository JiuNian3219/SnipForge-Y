<template>
  <div v-if="show && library" class="library-management-modal-overlay" @click.self="handleClose">
    <div class="library-management-modal" @click="closeDropdowns">
      <div class="library-management-modal-header">
        <div class="library-management-header-main">
          <div class="library-management-title-row">
            <h3>{{ library.name }}</h3>
            <div class="library-state-badges">
              <span
                v-for="badge in headerBadges"
                :key="badge.label"
                class="library-state-badge"
                :class="badge.tone"
              >
                {{ badge.label }}
              </span>
            </div>
          </div>
          <p class="library-management-path">{{ displayPath }}</p>
          <p class="library-management-note">{{ managementContextNote }}</p>
        </div>

        <div class="library-management-header-controls">
          <div class="library-header-actions">
            <button
              class="library-action-btn subtle"
              @click="$emit('refresh')"
              :disabled="syncing"
              title="Refresh library status"
            >
              Refresh
            </button>
            <button
              v-if="changesSummary.canSync"
              @click="$emit('sync', library.id)"
              class="library-action-btn subtle"
              :disabled="syncing"
              :title="changesSummary.syncTitle"
            >
              {{ syncing ? 'Syncing...' : 'Sync' }}
            </button>
            <button
              v-if="canImportIntoManagedLibrary"
              @click="$emit('import')"
              class="action-button import-button"
            >
              Import
            </button>
          </div>
          <button class="library-management-close" @click="handleClose" aria-label="Close library management">×</button>
        </div>
      </div>

      <div class="library-workspace">
        <section class="workspace-pane workspace-pane--list">
          <div class="workspace-pane-header workspace-pane-header--list">
            <div>
              <h4>Commands</h4>
              <p>{{ commandListNote }}</p>
            </div>

            <div class="selection-summary" :class="{ 'selection-summary--active': hasSelection }">
              <input
                type="checkbox"
                class="select-all-checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
              />
              <div class="selection-copy">
                <span class="selection-count">{{ selectionSummaryTitle }}</span>
                <span class="selection-subcopy">{{ selectionSummaryDetail }}</span>
              </div>
            </div>
          </div>

          <div class="workspace-pane-toolbar">
            <label class="toolbar-search toolbar-search--full">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                v-model.trim="searchQuery"
                type="text"
                placeholder="Search title, body, description, or tags"
              />
            </label>

            <div class="workspace-toolbar-secondary">
              <div class="toolbar-filters">
                <div class="filter-dropdown-wrap" @click.stop>
                  <button
                    @click="toggleManagementFilterDropdown"
                    :class="['toolbar-filter-button', { active: selectedManagementTags.length > 0 }]"
                    title="Filter by tags"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                    </svg>
                    <span>Tags</span>
                    <span v-if="selectedManagementTags.length > 0" class="toolbar-filter-count">{{ selectedManagementTags.length }}</span>
                  </button>

                  <div v-if="showManagementFilterDropdown" class="filter-dropdown">
                    <TagSelector
                      :available-tags="availableTags"
                      :selected-tags="selectedManagementTags"
                      title="Filter by Tags"
                      @toggle="toggleManagementTag"
                      @clear-all="clearManagementTags"
                    />
                  </div>
                </div>
              </div>

              <div class="toolbar-actions toolbar-actions--pane">
                <div class="toolbar-actions-group">
                  <div class="export-dropdown-wrap" @click.stop>
                    <button
                      @click="toggleExportDropdown"
                      :disabled="selectedCommandIds.length === 0"
                      class="action-button export-button"
                    >
                      Export
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m6 9 6 6 6-6"></path>
                      </svg>
                    </button>
                    <div v-if="showExportDropdown" class="export-dropdown">
                      <button class="export-dropdown-item" @click="handleExportBundle">As Bundle (.json)</button>
                      <button class="export-dropdown-item" @click="handleExportAsLibrary">As Library (.zip)</button>
                    </div>
                  </div>
                </div>
                <div v-if="canDeleteManagedCommands" class="toolbar-actions-group toolbar-actions-group--danger">
                  <button
                    @click="handleBulkDelete"
                    :disabled="selectedCommandIds.length === 0"
                    class="action-button delete-button"
                    title="Delete selected commands"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="command-list-container">
            <CommandList
              :commands="filteredManagementCommands"
              :selected-ids="selectedCommandIds"
              :empty-title="emptyState.title"
              :empty-message="emptyState.message"
              @toggle="toggleCommandSelection"
            />
          </div>
        </section>

        <section class="workspace-pane workspace-pane--details">
          <div class="workspace-pane-header workspace-pane-header--details">
            <div>
              <h4>Library</h4>
              <p>{{ libraryOverviewNote }}</p>
            </div>
          </div>

          <div class="overview-surface">
            <div class="overview-grid">
              <div class="overview-stat">
                <span class="detail-label">Commands</span>
                <span class="detail-value">{{ commands.length }}</span>
              </div>
              <div class="overview-stat">
                <span class="detail-label">Visible</span>
                <span class="detail-value">{{ filteredManagementCommands.length }}</span>
              </div>
              <div class="overview-stat">
                <span class="detail-label">Selected</span>
                <span class="detail-value">{{ selectedCommandIds.length }}</span>
              </div>
              <div class="overview-stat overview-stat--access">
                <span class="detail-label">Access</span>
                <span class="detail-value">{{ accessLabel }}</span>
              </div>
            </div>
            <p class="overview-guidance">{{ overviewGuidance }}</p>
          </div>

          <section class="secondary-panel details-panel">
            <div class="workspace-panel-header">
              <div>
                <h4>Library status</h4>
                <p>{{ changesSummary.headline }}. {{ changesSummary.detail }}</p>
              </div>
            </div>

            <div class="details-grid">
              <div class="detail-card">
                <span class="detail-label">Origin</span>
                <span class="detail-value">{{ library.origin ? 'Origin-backed' : 'Local only' }}</span>
                <span class="detail-meta">{{ library.origin?.url || 'No remote origin configured.' }}</span>
              </div>
              <div class="detail-card">
                <span class="detail-label">Working tree</span>
                <span class="detail-value" :class="`detail-value--${changesSummary.tone}`">{{ workingTreeLabel }}</span>
                <span class="detail-meta">{{ workingTreeDetail }}</span>
              </div>
              <div
                v-if="library.working_tree.state === 'dirty' || library.working_tree.state === 'clean'"
                class="detail-card"
              >
                <span class="detail-label">File summary</span>
                <div class="library-change-counts">
                  <span class="library-change-count"><strong>{{ library.working_tree.modified }}</strong> modified</span>
                  <span class="library-change-count"><strong>{{ library.working_tree.added }}</strong> new</span>
                  <span class="library-change-count"><strong>{{ library.working_tree.deleted }}</strong> deleted</span>
                </div>
              </div>
            </div>
          </section>

          <details v-if="library.origin" class="workflow-disclosure">
            <summary class="workflow-disclosure-summary">
              <span>Origin workflow</span>
              <span class="workflow-disclosure-copy">Git and remote actions for this library</span>
            </summary>

            <div class="workflow-disclosure-body">
              <section class="secondary-panel workflow-panel">
                <div class="workspace-panel-header">
                  <div>
                    <p v-if="workflowSummary">{{ workflowSummary.headline }}. {{ workflowSummary.detail }}</p>
                    <p v-else-if="workflowError" class="workflow-copy workflow-copy--danger">{{ workflowError }}</p>
                    <p v-else>Checking git-backed workflow support for this library.</p>
                  </div>
                </div>

                <div class="details-grid workflow-grid">
                  <div class="detail-card">
                    <span class="detail-label">Remote</span>
                    <span class="detail-value">{{ workflowSummary?.remote_name || 'Unavailable' }}</span>
                    <span class="detail-meta">{{ library.origin.url }}</span>
                  </div>
                  <div class="detail-card">
                    <span class="detail-label">Branch</span>
                    <span class="detail-value">{{ workflowSummary?.current_branch || 'Detached / unknown' }}</span>
                    <span class="detail-meta">Base: {{ workflowSummary?.default_branch || 'Unknown' }}</span>
                    <span class="detail-meta">
                      {{ workflowSummary?.has_upstream ? 'Tracks an upstream branch.' : 'No upstream branch configured.' }}
                    </span>
                  </div>
                </div>

                <div class="workflow-actions">
                  <button
                    v-if="library.working_tree.state === 'not_repo'"
                    class="library-action-btn subtle"
                    :disabled="!!workflowBusy"
                    title="Choose the real git-backed folder for this library"
                    @click="$emit('relink')"
                  >
                    {{ workflowBusy === 'relink' ? 'Relinking...' : 'Relink Working Copy' }}
                  </button>
                  <button
                    class="library-action-btn subtle"
                    :disabled="!!workflowBusy || !workflowActionState.fetch.available"
                    :title="workflowActionState.fetch.reason || 'Fetch origin refs'"
                    @click="$emit('fetch-origin')"
                  >
                    {{ workflowBusy === 'fetch' ? 'Fetching...' : 'Fetch' }}
                  </button>
                  <button
                    class="library-action-btn subtle"
                    :disabled="!!workflowBusy || !workflowActionState.update.available"
                    :title="workflowActionState.update.reason || 'Fast-forward this working copy from origin'"
                    @click="$emit('update-origin')"
                  >
                    {{ workflowBusy === 'update' ? 'Updating...' : 'Update' }}
                  </button>
                  <button
                    class="library-action-btn subtle"
                    :disabled="!!workflowBusy || !workflowActionState.commit.available"
                    :title="workflowActionState.commit.reason || 'Commit local changes in this library'"
                    @click="$emit('commit')"
                  >
                    {{ workflowBusy === 'commit' ? 'Committing...' : 'Commit' }}
                  </button>
                  <button
                    class="library-action-btn subtle"
                    :disabled="!!workflowBusy || !workflowActionState.push.available"
                    :title="workflowActionState.push.reason || 'Push the current branch to origin'"
                    @click="$emit('push')"
                  >
                    {{ workflowBusy === 'push' ? 'Pushing...' : 'Push' }}
                  </button>
                  <button
                    class="library-action-btn subtle"
                    :disabled="!!workflowBusy || !workflowActionState.pull_request.available"
                    :title="workflowActionState.pull_request.reason || 'Open a pull request from this branch'"
                    @click="$emit('pull-request')"
                  >
                    {{ workflowBusy === 'pull_request' ? 'Opening...' : 'Pull Request' }}
                  </button>
                </div>

                <p
                  v-if="workflowActionNote"
                  class="workflow-copy"
                  :class="{ 'workflow-copy--warning': !!workflowSummaryReason }"
                >
                  {{ workflowActionNote }}
                </p>
              </section>
            </div>
          </details>
        </section>
      </div>

      <div v-if="feedbackMessage" class="sync-message" :class="feedbackMessageType">
        {{ feedbackMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CommandList from './CommandList.vue'
import TagSelector from './TagSelector.vue'
import { getAllTags, matchesTagFilter } from '../utils/tags'
import { describeLibraryChanges } from '../utils/library-changes'
import type { Library, LibraryGitWorkflowSummary } from '../../shared/types'

interface ManagedCommand {
  id: number
  title: string
  body: string
  description?: string
  tags: string
  tagsArray: string[]
  tagsNormalized: string[]
  language?: string
  source?: string
  library_id?: number | null
  remote_path?: string | null
  created_at: string
  updated_at: string
}

interface Props {
  show: boolean
  library: Library | null
  defaultWritableLibrary: Library | null
  commands: ManagedCommand[]
  syncing: boolean
  workflowSummary: LibraryGitWorkflowSummary | null
  workflowError: string
  workflowBusy: null | 'fetch' | 'update' | 'relink' | 'commit' | 'push' | 'pull_request'
  feedbackMessage: string
  feedbackMessageType: 'success' | 'error'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  refresh: []
  sync: [libraryId: number]
  'fetch-origin': []
  'update-origin': []
  relink: []
  commit: []
  push: []
  'pull-request': []
  import: []
  'bulk-delete': [ids: number[]]
  'bulk-export': [ids: number[]]
  'export-library': [ids: number[]]
}>()

const selectedCommandIds = ref<number[]>([])
const selectedManagementTags = ref<string[]>([])
const showManagementFilterDropdown = ref(false)
const showExportDropdown = ref(false)
const searchQuery = ref('')

function isWritableLocalLibrary(library: Library | null | undefined): library is Library {
  return !!library && library.type === 'local' && !!library.manifest_path && library.permission !== 'consumer'
}

const canDeleteManagedCommands = computed(() => isWritableLocalLibrary(props.library))
const canImportIntoManagedLibrary = computed(() => {
  return !!props.library && props.library.id === props.defaultWritableLibrary?.id
})
const displayPath = computed(() => {
  if (!props.library) return ''
  return props.library.local_path || props.library.working_copy.local_path || props.library.github_repo
})
const accessLabel = computed(() => {
  if (!props.library) return ''
  return isWritableLocalLibrary(props.library) ? 'Writable' : 'Read-only'
})
const accessDetail = computed(() => {
  if (!props.library) return ''
  if (canImportIntoManagedLibrary.value) {
    return 'This is the default writable library for imports and new commands.'
  }
  if (isWritableLocalLibrary(props.library)) {
    return 'Commands in this library can be edited, exported, or deleted locally.'
  }
  return 'Commands here can be reviewed and exported, but destructive local actions stay disabled.'
})
const managementContextNote = computed(() => {
  if (!props.library) return ''
  if (canImportIntoManagedLibrary.value) {
    return 'This is your default writable library. Manage its command set here, and use the origin workflow only when you need repo actions.'
  }
  if (isWritableLocalLibrary(props.library)) {
    return 'Manage this library’s command set here. Repo workflow stays available as a separate secondary area.'
  }
  return 'This library is read-only in SnipForge. You can filter, review, and export commands here, while repo actions stay separate.'
})
const changesSummary = computed(() => {
  if (!props.library) {
    return {
      headline: '',
      detail: '',
      tone: 'neutral' as const,
      canSync: false,
      syncTitle: '',
    }
  }

  return describeLibraryChanges(props.library)
})
const workflowActionState = computed(() => props.workflowSummary?.actions || {
  fetch: { available: false, reason: null },
  update: { available: false, reason: null },
  commit: { available: false, reason: null },
  push: { available: false, reason: null },
  pull_request: { available: false, reason: null },
})
const workflowSummaryReason = computed(() => {
  return workflowActionState.value.pull_request.reason
    || workflowActionState.value.push.reason
    || workflowActionState.value.update.reason
    || workflowActionState.value.commit.reason
    || workflowActionState.value.fetch.reason
    || ''
})
const workflowActionNote = computed(() => {
  if (props.workflowError) return props.workflowError
  if (!props.workflowSummary) return ''
  return workflowSummaryReason.value || ''
})
const workingTreeLabel = computed(() => {
  switch (props.library?.working_tree.state) {
    case 'dirty':
      return 'Dirty'
    case 'clean':
      return 'Clean'
    case 'not_repo':
      return 'Not a git repo'
    case 'git_unavailable':
      return 'Git unavailable'
    case 'no_working_copy':
      return 'No working copy'
    case 'error':
      return 'Status error'
    default:
      return ''
  }
})
const workingTreeDetail = computed(() => {
  if (!props.library) return ''
  return props.library.working_tree.error || changesSummary.value.detail
})
const headerBadges = computed(() => {
  if (!props.library) return [] as Array<{ label: string; tone: string }>

  const badges: Array<{ label: string; tone: string }> = []

  if (props.defaultWritableLibrary?.id === props.library.id) {
    badges.push({ label: 'Default writable', tone: 'accent' })
  }

  badges.push({ label: props.library.origin ? 'Origin-backed' : 'Local only', tone: 'neutral' })

  if (!canDeleteManagedCommands.value) {
    badges.push({ label: 'Read-only', tone: 'muted' })
  }

  return badges
})
const availableTags = computed(() => getAllTags(props.commands))
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const filteredManagementCommands = computed(() => {
  return props.commands.filter(command => {
    const matchesTags = selectedManagementTags.value.length === 0
      || matchesTagFilter(command.tagsNormalized, selectedManagementTags.value)

    if (!matchesTags) return false
    if (!normalizedSearchQuery.value) return true

    const haystack = [
      command.title,
      command.description || '',
      command.body,
      command.tags,
      command.language || '',
    ].join(' ').toLowerCase()

    return haystack.includes(normalizedSearchQuery.value)
  })
})
const emptyState = computed(() => {
  if (!props.library) {
    return {
      title: 'No library selected',
      message: 'Choose a library to manage its commands.',
    }
  }

  if (normalizedSearchQuery.value || selectedManagementTags.value.length > 0) {
    return {
      title: 'No matching commands',
      message: 'Try clearing the search or tag filters to see more commands in this library.',
    }
  }

  if (canImportIntoManagedLibrary.value) {
    return {
      title: 'This library is empty',
      message: 'Import commands into your default writable library to start building it out.',
    }
  }

  if (isWritableLocalLibrary(props.library)) {
    return {
      title: 'No commands here yet',
      message: 'This library is writable, but it does not contain any commands yet.',
    }
  }

  return {
    title: 'No commands available',
    message: 'This read-only library has no indexed commands to manage right now.',
  }
})
const commandListNote = computed(() => {
  if (!props.library) return ''
  if (normalizedSearchQuery.value || selectedManagementTags.value.length > 0) {
    return 'Filter the library, then select the commands you want to export or remove.'
  }
  return 'Search, filter, and select commands for bulk actions.'
})
const libraryOverviewNote = computed(() => {
  if (hasSelection.value) {
    return 'Bulk actions are ready. Export the selected commands, or delete them if this library is writable.'
  }
  if (canDeleteManagedCommands.value) {
    return 'Use the command list to build a selection, then export or clean up the library.'
  }
  return 'This library is read-only here, so management stays limited to review, filtering, and export.'
})
const overviewGuidance = computed(() => {
  if (!props.library) return ''
  if (hasSelection.value) {
    return canDeleteManagedCommands.value
      ? 'You have a selection ready. Export it, or delete it if you are cleaning up this library.'
      : 'You have a selection ready to export. Destructive actions stay disabled because this library is read-only.'
  }
  if (normalizedSearchQuery.value || selectedManagementTags.value.length > 0) {
    return 'Current filters are narrowing the list. Select matching commands on the left to export them as a group.'
  }
  if (canImportIntoManagedLibrary.value) {
    return 'Import adds commands into this library. Once you have a selection, export and delete become available as needed.'
  }
  return 'Routine command management happens on the left. Open the origin workflow only when you need fetch, update, push, or PR actions.'
})
const hasSelection = computed(() => selectedCommandIds.value.length > 0)
const selectionSummaryTitle = computed(() => {
  return hasSelection.value
    ? `${selectedCommandIds.value.length} selected`
    : 'Bulk select'
})
const selectionSummaryDetail = computed(() => {
  const visibleCount = filteredManagementCommands.value.length
  const totalCount = props.commands.length
  const commandLabel = totalCount === 1 ? 'command' : 'commands'

  if (hasSelection.value) {
    return `${visibleCount} of ${totalCount} ${commandLabel} visible`
  }

  return `${visibleCount} ${visibleCount === 1 ? 'command' : 'commands'} visible`
})
const isAllSelected = computed(() =>
  filteredManagementCommands.value.length > 0 &&
  selectedCommandIds.value.length === filteredManagementCommands.value.length
)
const isIndeterminate = computed(() =>
  selectedCommandIds.value.length > 0 &&
  selectedCommandIds.value.length < filteredManagementCommands.value.length
)

function closeDropdowns() {
  showManagementFilterDropdown.value = false
  showExportDropdown.value = false
}

function resetState() {
  selectedCommandIds.value = []
  selectedManagementTags.value = []
  showManagementFilterDropdown.value = false
  showExportDropdown.value = false
  searchQuery.value = ''
}

function handleClose() {
  resetState()
  emit('close')
}

function toggleManagementFilterDropdown() {
  showManagementFilterDropdown.value = !showManagementFilterDropdown.value
}

function toggleManagementTag(tag: string) {
  const index = selectedManagementTags.value.indexOf(tag)
  if (index === -1) {
    selectedManagementTags.value.push(tag)
  } else {
    selectedManagementTags.value.splice(index, 1)
  }
}

function clearManagementTags() {
  selectedManagementTags.value = []
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedCommandIds.value = []
  } else {
    selectedCommandIds.value = filteredManagementCommands.value.map(cmd => cmd.id)
  }
}

function toggleCommandSelection(id: number) {
  const index = selectedCommandIds.value.indexOf(id)
  if (index === -1) {
    selectedCommandIds.value.push(id)
  } else {
    selectedCommandIds.value.splice(index, 1)
  }

}

function handleBulkDelete() {
  if (selectedCommandIds.value.length === 0) return
  emit('bulk-delete', [...selectedCommandIds.value])
  selectedCommandIds.value = []
}

function toggleExportDropdown() {
  showExportDropdown.value = !showExportDropdown.value
}

function handleExportBundle() {
  showExportDropdown.value = false
  if (selectedCommandIds.value.length === 0) return
  emit('bulk-export', [...selectedCommandIds.value])
}

function handleExportAsLibrary() {
  showExportDropdown.value = false
  if (selectedCommandIds.value.length === 0) return
  emit('export-library', [...selectedCommandIds.value])
}

watch(() => props.show, visible => {
  if (!visible) resetState()
})

watch(() => props.library?.id, () => {
  resetState()
})

watch(filteredManagementCommands, commands => {
  const visibleIds = new Set(commands.map(command => command.id))
  selectedCommandIds.value = selectedCommandIds.value.filter(id => visibleIds.has(id))
}, { immediate: true })
</script>

<style scoped>
.library-management-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal) + 1);
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.library-management-modal {
  width: min(1380px, calc(100vw - 48px));
  height: min(900px, calc(100vh - 48px));
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-app) 92%, black) 0%, var(--bg-app) 100%);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  container-type: inline-size;
}

.library-management-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.library-management-header-main {
  min-width: 0;
}

.library-management-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.library-management-title-row h3 {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
}

.library-state-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.library-state-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-surface) 94%, transparent);
  color: var(--text-tertiary);
}

.library-state-badge.accent {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-surface));
  color: var(--text-primary);
}

.library-state-badge.muted {
  color: var(--text-secondary);
}

.library-management-path {
  margin: 0 0 6px 0;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: monospace;
  word-break: break-all;
}

.library-management-note {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
  max-width: 900px;
}

.library-management-header-controls {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0;
}

.library-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 420px;
}

.library-management-close {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.library-management-close:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.selection-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--text-secondary);
}

.selection-summary--active {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, var(--border));
}

.selection-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selection-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.selection-subcopy {
  font-size: 12px;
  color: var(--text-tertiary);
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.toolbar-search {
  min-width: 0;
  width: 100%;
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.toolbar-search input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
}

.toolbar-search input::placeholder {
  color: var(--text-placeholder);
}

.filter-dropdown-wrap,
.export-dropdown-wrap {
  position: relative;
}

.toolbar-filter-button,
.action-button,
.library-action-btn {
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.toolbar-filter-button,
.action-button,
.library-action-btn.subtle {
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
  color: var(--text-secondary);
}

.toolbar-filter-button:hover,
.toolbar-filter-button.active,
.library-action-btn:hover:not(:disabled),
.export-button:hover:not(:disabled),
.import-button:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.toolbar-filter-button.active {
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.toolbar-filter-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--text-primary);
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.select-all-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border);
  border-radius: 3px;
  background: var(--bg-surface);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}

.select-all-checkbox:checked,
.select-all-checkbox:indeterminate {
  background: var(--accent);
  border-color: var(--accent);
}

.select-all-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4.5px;
  top: 1.5px;
  width: 4px;
  height: 8px;
  border: solid var(--bg-app);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.select-all-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 6px;
  width: 7px;
  height: 0;
  border: solid var(--bg-app);
  border-width: 0 0 2px 0;
}

.action-button:disabled,
.library-action-btn:disabled,
.toolbar-filter-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: var(--text-tertiary);
}

.import-button {
  border-color: color-mix(in srgb, var(--accent) 38%, var(--border));
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
  color: var(--text-primary);
}

.toolbar-actions-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-actions-group--danger {
  margin-left: 4px;
}

.delete-button {
  border: 1px solid color-mix(in srgb, #ef5350 28%, var(--border));
  background: color-mix(in srgb, #ef5350 7%, var(--bg-surface));
  color: color-mix(in srgb, #ef8b89 72%, var(--text-secondary));
}

.delete-button:hover:not(:disabled) {
  background: color-mix(in srgb, #ef5350 12%, var(--bg-hover));
  border-color: color-mix(in srgb, #ef5350 42%, var(--border-hover));
  color: #efb0ae;
}

.filter-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: var(--z-dropdown);
  width: 220px;
}

.export-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: var(--z-dropdown);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  min-width: 190px;
  overflow: hidden;
}

.export-dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.export-dropdown-item:hover {
  background: var(--bg-hover);
}

.export-dropdown-item + .export-dropdown-item {
  border-top: 1px solid var(--border);
}

.library-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.workspace-pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--bg-input) 90%, transparent);
}

.workspace-pane--details {
  background: color-mix(in srgb, var(--bg-input) 94%, transparent);
}

.workspace-pane-header,
.workspace-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.workspace-pane-header h4,
.workspace-panel-header h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.workspace-pane-header p,
.workspace-panel-header p,
.workflow-copy {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.workspace-pane-header--list {
  padding-bottom: 2px;
}

.workspace-pane-toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-surface) 78%, transparent);
}

.toolbar-search--full {
  width: 100%;
  min-width: 0;
}

.workspace-toolbar-secondary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-actions--pane {
  justify-content: flex-end;
  margin-left: auto;
  flex-wrap: wrap;
}

.workflow-copy--danger {
  color: #ef8b89;
}

.workflow-copy--warning {
  color: #f5c76b;
}

.command-list-container {
  flex: 1;
  min-height: 0;
}

.overview-surface {
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  border-radius: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-app) 72%, var(--bg-input)) 0%, color-mix(in srgb, var(--bg-input) 94%, black 6%) 100%);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.overview-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-surface) 50%, transparent);
}

.overview-stat .detail-value {
  font-size: 18px;
}

.overview-stat--access .detail-value {
  font-size: 16px;
}

.overview-guidance {
  margin: 14px 0 0 0;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.workspace-pane--details {
  min-height: 0;
}

.secondary-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-surface) 48%, transparent);
  min-width: 0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0 0 0;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 0;
  background: transparent;
  min-width: 0;
}

.detail-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-value--success {
  color: var(--text-primary);
}

.detail-value--warning {
  color: var(--text-primary);
}

.detail-value--danger {
  color: #efb0ae;
}

.detail-meta {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  word-break: break-word;
}

.library-change-counts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.library-change-count {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-app) 45%, transparent);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
}

.library-change-count strong {
  color: var(--text-primary);
}

.workflow-disclosure {
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-surface) 42%, transparent);
  overflow: hidden;
}

.workflow-disclosure-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.workflow-disclosure-summary::-webkit-details-marker {
  display: none;
}

.workflow-disclosure-copy {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.workflow-disclosure-body {
  padding: 0 14px 14px 14px;
}

.workflow-disclosure[open] .workflow-disclosure-summary {
  border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
}

.workflow-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.workflow-actions .library-action-btn {
  min-width: 0;
}

.workspace-empty-state {
  flex: 1;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  color: var(--text-secondary);
}

.workspace-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-message {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  flex-shrink: 0;
}

.sync-message.success {
  color: #7fd184;
  background: rgba(102, 187, 106, 0.1);
}

.sync-message.error {
  color: #ef8b89;
  background: rgba(239, 83, 80, 0.1);
}

@container (min-width: 1100px) {
  .library-workspace {
    grid-template-columns: minmax(320px, 0.92fr) minmax(0, 1.08fr);
  }
}

@container (max-width: 1099px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .library-management-modal-header {
    flex-direction: column;
    align-items: stretch;
  }

  .library-management-header-controls {
    align-items: center;
    justify-content: space-between;
  }

  .library-header-actions {
    justify-content: flex-start;
    max-width: none;
  }

  .workspace-pane {
    padding: 16px;
  }
}

@container (max-width: 860px) {
  .library-management-modal {
    padding: 14px;
    gap: 12px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .library-management-title-row h3 {
    font-size: 20px;
  }

  .library-management-note {
    font-size: 12px;
  }

  .workspace-pane-header,
  .workspace-toolbar-secondary,
  .toolbar-actions,
  .workflow-disclosure-summary {
    flex-direction: column;
    align-items: stretch;
  }

  .selection-summary,
  .toolbar-actions-group {
    align-items: flex-start;
  }

  .toolbar-actions--pane {
    margin-left: 0;
  }

  .library-management-title-row {
    align-items: flex-start;
  }
}

@container (max-width: 620px) {
  .library-management-header-controls,
  .library-header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .library-management-close {
    align-self: flex-start;
  }
}

@media (max-width: 1100px) {
  .library-management-modal {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
  }
}

@media (max-width: 900px) {
  .library-management-modal {
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
  }
}
</style>
