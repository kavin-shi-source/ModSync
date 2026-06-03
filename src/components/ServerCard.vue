<template>
  <div class="server-card" @click="$emit('select', server.id)">
    <div class="card-header">
      <el-input
        v-if="editing"
        v-model="editName"
        ref="nameInput"
        size="small"
        @blur="saveName"
        @keyup.enter="saveName"
        @click.stop
      />
      <span v-else class="server-name">{{ server.name }}</span>
      <el-button
        :icon="Edit"
        size="small"
        circle
        @click.stop="startEditing"
      />
    </div>
    <div class="card-info">
      <span class="path">{{ server.path }}</span>
    </div>
    <div class="card-actions">
      <el-button size="small" @click.stop="$emit('enter', server.id)">管理模组</el-button>
      <el-button size="small" @click.stop="$emit('sync', server.id)">同步</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Edit } from '@element-plus/icons-vue'

const props = defineProps({
  server: { type: Object, required: true },
})
const emit = defineEmits(['select', 'enter', 'sync', 'update:name'])

const editing = ref(false)
const editName = ref('')

function startEditing() { editing.value = true; editName.value = props.server.name }
function saveName() {
  if (editName.value.trim()) {
    emit('update:name', props.server.id, editName.value)
  }
  editing.value = false
}
</script>

<style scoped>
.server-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.server-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.server-name { font-weight: bold; font-size: 16px; }
.card-info .path { font-size: 12px; color: #909399; }
.card-actions { margin-top: 12px; display: flex; gap: 8px; }
</style>
