'use client'

import { useEffect, useState } from 'react'
import { BarChart3, FileStack, HardDrive } from 'lucide-react'
import { getStats, type ScanStats } from '@/lib/statsStorage'
import { useCountAnimation } from '@/hooks/useCountAnimation'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  unit?: string
  formatValue?: (value: number) => string
  color: string
}

function StatCard({ icon, label, value, unit, formatValue, color }: StatCardProps) {
  const animatedValue = useCountAnimation(value, 1500)
  const displayValue = formatValue ? formatValue(animatedValue) : animatedValue.toLocaleString()

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-md border border-border/40 p-2 flex items-center gap-2 hover:bg-card/70 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden">
      {/* Background decoration - subtle glow on hover */}
      <div className="absolute inset-0 bg-primary/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative z-10 w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300 flex-shrink-0">
        <div style={{ color }} className="transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>

      <div className="flex-1 min-w-0 relative z-10">
        <h3 className="text-xs font-semibold text-foreground">{label}</h3>
        <div className="flex items-baseline gap-1">
          <p
            className="text-sm font-bold tabular-nums leading-tight"
            style={{ color }}
          >
            {displayValue}
          </p>
          {unit && (
            <p className="text-[10px] text-muted-foreground font-medium">{unit}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// 格式化檔案大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)

  // 根據大小調整小數位數
  if (value >= 100) {
    return Math.round(value).toString()
  } else if (value >= 10) {
    return value.toFixed(1)
  } else {
    return value.toFixed(2)
  }
}

// 獲取檔案大小單位
function getBytesUnit(bytes: number): string {
  if (bytes === 0) return 'B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return sizes[i]
}

export function StatsDisplay() {
  const [stats, setStats] = useState<ScanStats>({
    totalScans: 0,
    totalFiles: 0,
    totalSize: 0,
    lastScanDate: '',
  })

  useEffect(() => {
    // 載入統計數據
    const loadedStats = getStats()
    setStats(loadedStats)

    // 監聽 storage 事件以便在其他標籤頁更新時同步
    const handleStorageChange = () => {
      setStats(getStats())
    }

    window.addEventListener('storage', handleStorageChange)

    // 也監聽自定義事件，用於同一頁面內的更新
    const handleStatsUpdate = () => {
      setStats(getStats())
    }
    window.addEventListener('stats-updated', handleStatsUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('stats-updated', handleStatsUpdate)
    }
  }, [])

  return (
    <>
      <StatCard
        icon={<BarChart3 className="w-3 h-3" />}
        label="累計掃描次數"
        value={stats.totalScans}
        color="#3b82f6"
      />

      <StatCard
        icon={<FileStack className="w-3 h-3" />}
        label="累計掃描檔案"
        value={stats.totalFiles}
        unit="個"
        color="#8b5cf6"
      />

      <StatCard
        icon={<HardDrive className="w-3 h-3" />}
        label="累計掃描資料量"
        value={stats.totalSize}
        unit={getBytesUnit(stats.totalSize)}
        formatValue={formatBytes}
        color="#ec4899"
      />
    </>
  )
}
