import { ElMessage } from 'element-plus'

export function showSuccess(msg) {
  ElMessage({ type: 'success', message: msg, duration: 3000 })
}

export function showError(msg, detail = '') {
  ElMessage({ type: 'error', message: detail ? `${msg}：${detail}` : msg, duration: 5000 })
}

export function showWarning(msg) {
  ElMessage({ type: 'warning', message: msg, duration: 4000 })
}

export function showInfo(msg) {
  ElMessage({ type: 'info', message: msg, duration: 3000 })
}
