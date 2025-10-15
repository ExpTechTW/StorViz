// 統計數據管理工具

export interface ScanStats {
  totalScans: number // 累計掃描次數
  totalFiles: number // 累計掃描檔案數量
  totalSize: number // 累計掃描資料量（bytes）
  lastScanDate: string // 最後掃描時間
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
    }
  }

  try {
    const stored = localStorage.getItem(STATS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }

  return {
    totalScans: 0,
    totalFiles: 0,
    totalSize: 0,
    lastScanDate: '',
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
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats))

    // 觸發自定義事件以通知組件更新
    window.dispatchEvent(new Event('stats-updated'))
  } catch (error) {
    console.error('Failed to update stats:', error)
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
