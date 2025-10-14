'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

interface FileNode {
  name: string
  size: number
  path: string
  children?: FileNode[]
  isDirectory: boolean
}

interface ChartData {
  name: string
  value: number
  color: string
  path: string
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#6366f1', '#f43f5e', '#84cc16', '#a855f7',
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const path = searchParams.get('path')

  const [data, setData] = useState<FileNode | null>(null)
  const [currentLevel, setCurrentLevel] = useState<FileNode | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<FileNode[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (path) {
      scanFolder(path)
    }
  }, [path])

  const scanFolder = async (folderPath: string) => {
    try {
      setIsLoading(true)
      const result = await invoke<FileNode>('scan_directory', { path: folderPath })
      setData(result)
      setCurrentLevel(result)
      setBreadcrumb([result])
    } catch (error) {
      console.error('掃描資料夾時發生錯誤:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePieClick = (entry: ChartData, index: number) => {
    if (!currentLevel || !currentLevel.children) return

    const clickedNode = currentLevel.children.find(child => child.path === entry.path)
    if (clickedNode && clickedNode.isDirectory && clickedNode.children) {
      setCurrentLevel(clickedNode)
      setBreadcrumb([...breadcrumb, clickedNode])
      setActiveIndex(null)
    }
  }

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)
    setCurrentLevel(newBreadcrumb[newBreadcrumb.length - 1])
    setActiveIndex(null)
  }

  const prepareChartData = (node: FileNode | null): ChartData[] => {
    if (!node || !node.children) return []

    return node.children
      .filter(child => child.size > 0)
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map((child, index) => ({
        name: child.name,
        value: child.size,
        color: COLORS[index % COLORS.length],
        path: child.path,
      }))
  }

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    )
  }

  if (!path) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">未選擇資料夾</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">正在掃描資料夾...</p>
        </div>
      </div>
    )
  }

  const chartData = prepareChartData(currentLevel)
  const totalSize = currentLevel?.size || 0

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h1 className="text-2xl font-bold text-foreground">儲存空間分析</h1>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            {breadcrumb.map((node, index) => (
              <div key={node.path} className="flex items-center gap-2">
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`hover:text-primary transition-colors ${
                    index === breadcrumb.length - 1
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {node.name}
                </button>
                {index < breadcrumb.length - 1 && (
                  <span className="text-muted-foreground">/</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">空間占比</h2>
            {chartData.length > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      activeIndex={activeIndex ?? undefined}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={handlePieClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {formatBytes(totalSize)}
                    </div>
                    <div className="text-sm text-muted-foreground">總大小</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                此資料夾為空
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">檔案列表</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {chartData.map((item, index) => (
                <div
                  key={item.path}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handlePieClick(item, index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-foreground truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground ml-4">
                    {formatBytes(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  )
}
