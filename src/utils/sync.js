import { showSuccess } from '@/utils/feedback'

export async function executeSync(diffList, { servers, serverDiffs, templatePath, syncing, syncProgress }) {
  syncing.value = true
  syncProgress.start('正在同步...', diffList.length)
  let successCount = 0
  let failCount = 0
  // 按服务器分组执行
  const serverMap = {}
  for (const diff of diffList) {
    const server = servers.find(s =>
      (serverDiffs[s.id] || []).some(d => d.relativePath === diff.relativePath)
    )
    if (!server) continue
    if (!serverMap[server.id]) serverMap[server.id] = { server, diffs: [] }
    serverMap[server.id].diffs.push(diff)
  }

  for (const entry of Object.values(serverMap)) {
    const { server, diffs: serverDiffsList } = entry
    for (const diff of serverDiffsList) {
      try {
        if (diff.type === 'serverOnly') {
          const result = await window.electronAPI.syncCollectToTemplate(server.path, templatePath, diff.relativePath)
          if (result.success) successCount++
          else failCount++
        } else {
          const dest = `${server.path}/${diff.relativePath}`
          const result = await window.electronAPI.syncFile(diff.templateFile.fullPath, dest)
          if (result.success) successCount++
          else failCount++
        }
      } catch {
        failCount++
      }
      syncProgress.update()
    }
  }
  syncing.value = false
  syncProgress.complete(`同步完成: 成功 ${successCount} 个，失败 ${failCount} 个`)
  showSuccess(`同步完成: 成功 ${successCount} 个，失败 ${failCount} 个`)
}
