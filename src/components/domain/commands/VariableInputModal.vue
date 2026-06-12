<template>
  <BaseModal
    :show="show"
    :title="$t('variableModal.title')"
    :close-label="$t('common.close')"
    @close="$emit('cancel')"
  >
    <div class="variable-info">
      <p>{{ $t('variableModal.description') }}</p>
    </div>

    <div v-for="variable in variables" :key="variable" class="form-group">
      <label :for="variable">{{ variable }}:</label>
      <BaseInput
        :id="variable"
        v-model="values[variable]"
        :placeholder="$t('variableModal.placeholder', { variable })"
        :ref="el => { if (el) inputRefs[variable] = el as unknown as InputHandle }"
      />
    </div>

    <template #footer>
      <BaseButton variant="secondary" @click="$emit('cancel')">
        {{ $t('common.cancel') }}
      </BaseButton>
      <BaseButton variant="primary" @click="handleSubmit">
        {{ $t('variableModal.copyCommand') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { watch, nextTick, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '../../ui/BaseButton.vue'
import BaseInput from '../../ui/BaseInput.vue'
import BaseModal from '../../ui/BaseModal.vue'

interface Props {
  show: boolean
  variables: string[]
}

type InputHandle = {
  focus: () => void
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  submit: [values: Record<string, string>]
  cancel: []
}>()

const values = reactive<Record<string, string>>({})
const inputRefs = reactive<Record<string, InputHandle>>({})

watch(() => props.variables, (newVariables) => {
  Object.keys(values).forEach(key => delete values[key])
  Object.keys(inputRefs).forEach(key => delete inputRefs[key])

  newVariables.forEach(variable => {
    values[variable] = ''
  })
}, { immediate: true })

watch(() => props.show, (isShown) => {
  if (isShown && props.variables.length > 0) {
    nextTick(() => {
      inputRefs[props.variables[0]]?.focus()
    })
  }
})

function handleSubmit() {
  const emptyVariables = props.variables.filter(variable => !values[variable]?.trim())

  if (emptyVariables.length > 0) {
    alert(t('variableModal.missingValues', { variables: emptyVariables.join(', ') }))
    return
  }

  emit('submit', { ...values })
}
</script>

<style scoped>
.variable-info {
  margin-bottom: 20px;
}

.variable-info p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}
</style>
