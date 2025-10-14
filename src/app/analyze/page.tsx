'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Tooltip } from 'recharts'
import { ArrowLeft, Loader2, Folder, File } from 'lucide-react'
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
  node: FileNode
}

interface LayerData {
  data: ChartData[]
  innerRadius: number
  outerRadius: number
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#6366f1', '#f43f5e', '#84cc16', '#a855f7',
]

// Color schemes for each folder - same folder uses same color family
const COLOR_SCHEMES = [
  ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'], // Blue
  ['#6b21a8', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'], // Purple
  ['#be185d', '#ec4899', '#f472b6', '#f9a8d4', '#fce7f3'], // Pink
  ['#b45309', '#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'], // Amber
  ['#047857', '#10b981', '#34d399', '#6ee7b7', '#d1fae5'], // Green
  ['#0369a1', '#0ea5e9', '#38bdf8', '#7dd3fc', '#e0f2fe'], // Sky
  ['#4338ca', '#6366f1', '#818cf8', '#a5b4fc', '#e0e7ff'], // Indigo
  ['#be123c', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3'], // Rose
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

  const prepareMultiLayerData = (rootNode: FileNode | null, maxDepth: number = 4): LayerData[] => {
    if (!rootNode || !rootNode.children) return []

    const layers: LayerData[] = []
    const layerThickness = 40

    // Helper to collect nodes with parent context for coloring
    const collectNodesAtDepth = (
      nodes: FileNode[],
      currentDepth: number,
      targetDepth: number,
      parentColorIndex: number = 0,
      parentPath: string = ''
    ): ChartData[] => {
      if (currentDepth === targetDepth) {
        return nodes
          .filter(node => node.size > 0)
          .sort((a, b) => b.size - a.size)
          .map((node, idx) => {
            // Use parent's color scheme, with depth-based shade variation
            const colorScheme = COLOR_SCHEMES[parentColorIndex % COLOR_SCHEMES.length]
            const color = colorScheme[Math.min(currentDepth, colorScheme.length - 1)]

            return {
              name: node.name,
              value: node.size,
              color: color,
              path: node.path,
              node: node,
            }
          })
      }

      if (currentDepth > targetDepth) return []

      const result: ChartData[] = []
      nodes.forEach((node, idx) => {
        if (node.isDirectory && node.children) {
          // Each sibling folder gets its own color scheme
          const childColorIndex = parentPath === '' ? idx : parentColorIndex

          const childData = collectNodesAtDepth(
            node.children,
            currentDepth + 1,
            targetDepth,
            childColorIndex,
            node.path
          )
          result.push(...childData)
        }
      })

      return result
    }

    // Build layers from inside (depth 0) to outside (depth maxDepth)
    for (let depth = 0; depth < maxDepth; depth++) {
      const layerData = collectNodesAtDepth(rootNode.children, 0, depth, 0, '')

      if (layerData.length === 0) break

      const innerRadius = 60 + (depth * layerThickness)
      const outerRadius = innerRadius + layerThickness - 3

      layers.push({
        data: layerData,
        innerRadius,
        outerRadius,
      })
    }

    return layers
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
        node: child,
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

  // Redraw chart based on current level
  const layers = prepareMultiLayerData(currentLevel)
  const chartData = prepareChartData(currentLevel)
  const totalSize = currentLevel?.size || 0

  const handleGoBack = () => {
    if (breadcrumb.length > 1) {
      const newBreadcrumb = breadcrumb.slice(0, -1)
      setBreadcrumb(newBreadcrumb)
      setCurrentLevel(newBreadcrumb[newBreadcrumb.length - 1])
      setActiveIndex(null)
    }
  }

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isDirectory = data.node?.isDirectory

      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
          <div className="flex items-center gap-2 mb-2">
            {isDirectory ? (
              <Folder className="w-4 h-4 text-primary" />
            ) : (
              <File className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">
              {isDirectory ? 'Folder' : 'File'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-foreground font-medium truncate max-w-[200px]">
              {data.name}
            </div>
            <div className="text-muted-foreground">
              Size: <span className="font-medium text-foreground">{formatBytes(data.value)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
            {breadcrumb.length > 1 && (
              <>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={handleGoBack}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Up One Level
                </button>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Storage Analysis</h1>
        </div>

        {/* Full Path Display */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Current Path
            </div>
            <div className="text-sm font-mono text-foreground bg-muted px-3 py-2 rounded-md break-all">
              {currentLevel?.path || path}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Nested Storage Distribution</h2>
            {layers.length > 0 ? (
              <div className="relative">
                <div className="relative z-10">
                  <ResponsiveContainer width="100%" height={500}>
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                      {layers.map((layer, layerIndex) => (
                        <Pie
                          key={`layer-${layerIndex}`}
                          data={layer.data}
                          cx="50%"
                          cy="50%"
                          innerRadius={layer.innerRadius}
                          outerRadius={layer.outerRadius}
                          paddingAngle={1}
                          dataKey="value"
                          onClick={(entry) => {
                            if (entry.node.isDirectory && entry.node.children) {
                              setCurrentLevel(entry.node)
                              setBreadcrumb([...breadcrumb, entry.node])
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {layer.data.map((entry, index) => (
                            <Cell key={`cell-${layerIndex}-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      ))}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {formatBytes(totalSize)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Size</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                Empty folder
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">File List (Current Level)</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {chartData.map((item, index) => (
                <div
                  key={item.path}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handlePieClick(item, index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.node.isDirectory ? (
                      <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
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
