// 統計數據管理工具

export interface ScanStats {
  totalScans: number // 累計掃描次數
  totalFiles: number // 累計掃描檔案數量
  totalSize: number // 累計掃描資料量（bytes）
  lastScanDate: string // 最後掃描時間
  totalDeleted: number // 累計刪除檔案數量
  totalDeletedSize: number // 累計刪除資料量（bytes）
}

const STATS_KEY = 'storviz-scan-stats'

// 獲取統計數據
export function getStats(): ScanStats {
  if (typeof window === 'undefined') {
    return {
      totalScans: 0,
      totalFiles: 0,
      totalSize: 0,
      lastScanDate: '',
      totalDeleted: 0,
      totalDeletedSize: 0,
    }
  }

  try {
    const stored = localStorage.getItem(STATS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Ensure backward compatibility by adding missing fields
      return {
        totalScans: parsed.totalScans || 0,
        totalFiles: parsed.totalFiles || 0,
        totalSize: parsed.totalSize || 0,
        lastScanDate: parsed.lastScanDate || '',
        totalDeleted: parsed.totalDeleted || 0,
        totalDeletedSize: parsed.totalDeletedSize || 0,
      }
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }

  return {
    totalScans: 0,
    totalFiles: 0,
    totalSize: 0,
    lastScanDate: '',
    totalDeleted: 0,
    totalDeletedSize: 0,
  }
}

// 更新統計數據（添加新的掃描結果）
export function updateStats(filesScanned: number, sizeScanned: number): void {
  if (typeof window === 'undefined') return

  try {
    const currentStats = getStats()
    const updatedStats: ScanStats = {
      totalScans: currentStats.totalScans + 1,
      totalFiles: currentStats.totalFiles + filesScanned,
      totalSize: currentStats.totalSize + sizeScanned,
      lastScanDate: new Date().toISOString(),
      totalDeleted: currentStats.totalDeleted,
      totalDeletedSize: currentStats.totalDeletedSize,
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats))

    // 觸發自定義事件以通知組件更新
    window.dispatchEvent(new Event('stats-updated'))
  } catch (error) {
    console.error('Failed to update stats:', error)
  }
}

// 更新刪除統計數據
export function updateDeleteStats(filesDeleted: number, sizeDeleted: number): void {
  if (typeof window === 'undefined') return

  try {
    const currentStats = getStats()
    const updatedStats: ScanStats = {
      ...currentStats,
      totalDeleted: currentStats.totalDeleted + filesDeleted,
      totalDeletedSize: currentStats.totalDeletedSize + sizeDeleted,
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats))

    // 觸發自定義事件以通知組件更新
    window.dispatchEvent(new Event('stats-updated'))
  } catch (error) {
    console.error('Failed to update delete stats:', error)
  }
}

// 重置統計數據
export function resetStats(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STATS_KEY)
  } catch (error) {
    console.error('Failed to reset stats:', error)
  }
}
