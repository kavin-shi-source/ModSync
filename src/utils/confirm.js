import { ElMessageBox } from 'element-plus'

export async function confirmDelete(title, detail = '') {
  try {
    await ElMessageBox.confirm(
      detail || '此操作不可撤销，确定继续吗？',
      title || '确认删除',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
    )
    return true
  } catch { return false }
}

export async function confirmBatch(title, count, detail = '') {
  try {
    await ElMessageBox.confirm(
      detail || `将影响 ${count} 个项目，确定继续吗？`,
      title || '确认批量操作',
      { confirmButtonText: '确认执行', cancelButtonText: '取消', type: 'warning' }
    )
    return true
  } catch { return false }
}

export async function confirmAction(title, message, confirmText = '确认') {
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: confirmText, cancelButtonText: '取消', type: 'info'
    })
    return true
  } catch { return false }
}
