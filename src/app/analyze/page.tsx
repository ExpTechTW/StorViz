'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sector } from 'recharts'
import { ArrowLeft, Loader2, Folder, File } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

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
  startAngle?: number
  endAngle?: number
}

interface LayerData {
  data: ChartData[]
  innerRadius: number
  outerRadius: number
  depth: number
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
  const [scanProgress, setScanProgress] = useState<{ currentPath: string; filesScanned: number; scannedSize: number; estimatedTotal: number } | null>(null)
  const [diskInfo, setDiskInfo] = useState<{ totalSpace: number; availableSpace: number; usedSpace: number } | null>(null)

  useEffect(() => {
    if (!path) return

    // Generate event ID using seconds timestamp
    const eventId = Math.floor(Date.now() / 1000).toString()
    console.log('[DEBUG] useEffect 觸發, eventId:', eventId)

    let unlistenFn: (() => void) | null = null

    const scanFolder = async () => {
      try {
        console.log('[DEBUG] 開始掃描, setIsLoading(true)')
        setIsLoading(true)
        setScanProgress({ currentPath: path, filesScanned: 0, scannedSize: 0, estimatedTotal: 0 })

        const unlisten = await listen<{ current_path: string; files_scanned: number; scanned_size: number; estimated_total: number }>('scan-progress', (event) => {
          setScanProgress({
            currentPath: event.payload.current_path,
            filesScanned: event.payload.files_scanned,
            scannedSize: event.payload.scanned_size,
            estimatedTotal: event.payload.estimated_total
          })
        })
        unlistenFn = unlisten

        console.log('[DEBUG] 開始調用 scan_directory, eventId:', eventId)
        const result = await invoke<{ node: FileNode; diskInfo?: { totalSpace: number; availableSpace: number; usedSpace: number } }>('scan_directory', { path, eventId })

        console.log('[DEBUG] scan_directory 返回')
        console.log('[DEBUG] result:', result)
        console.log('[DEBUG] result.node:', result.node)
        console.log('[DEBUG] result.diskInfo:', result.diskInfo)

        console.log('[DEBUG] 設置資料, setIsLoading(false)')
        setData(result.node)
        setCurrentLevel(result.node)
        setBreadcrumb([result.node])
        setDiskInfo(result.diskInfo || null)
        setIsLoading(false)
        setScanProgress(null)
      } catch (error) {
        console.log('[DEBUG] scan_directory 錯誤:', error)
        // Backend handles deduplication, silently ignore duplicate scan errors
      } finally {
        console.log('[DEBUG] finally 區塊, unlisten')
        if (unlistenFn) {
          unlistenFn()
        }
      }
    }

    scanFolder()

    // Cleanup function - only unlisten, don't cancel state updates
    return () => {
      console.log('[DEBUG] cleanup 函數執行')
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [path])

  // Helper functions must be defined before use
  const prepareMultiLayerData = (rootNode: FileNode | null, maxDepth: number = 4): LayerData[] => {
    if (!rootNode || !rootNode.children) return []

    const layers: Map<number, ChartData[]> = new Map()
    const layerThickness = 40

    // Build hierarchical data with angle calculations
    const buildHierarchy = (
      nodes: FileNode[],
      depth: number,
      startAngle: number,
      endAngle: number,
      parentColorIndex: number
    ) => {
      if (depth >= maxDepth || !nodes || nodes.length === 0) return

      const sortedNodes = nodes
        .filter(node => node.size > 0)
        .sort((a, b) => b.size - a.size)

      const totalSize = sortedNodes.reduce((sum, node) => sum + node.size, 0)
      let currentAngle = startAngle
      const angleRange = endAngle - startAngle

      sortedNodes.forEach((node) => {
        const proportion = node.size / totalSize
        const nodeAngleRange = angleRange * proportion
        const nodeEndAngle = currentAngle + nodeAngleRange

        // Get color for this node
        const colorScheme = COLOR_SCHEMES[parentColorIndex % COLOR_SCHEMES.length]
        const color = colorScheme[Math.min(depth, colorScheme.length - 1)]

        // Add to current layer
        if (!layers.has(depth)) {
          layers.set(depth, [])
        }

        layers.get(depth)!.push({
          name: node.name,
          value: node.size,
          color: color,
          path: node.path,
          node: node,
          startAngle: currentAngle,
          endAngle: nodeEndAngle,
        })

        // Process children recursively
        if (node.isDirectory && node.children && node.children.length > 0 && depth < maxDepth - 1) {
          buildHierarchy(
            node.children,
            depth + 1,
            currentAngle,
            nodeEndAngle,
            parentColorIndex
          )
        }

        currentAngle = nodeEndAngle
      })
    }

    // Process root level - each top-level folder gets its own color scheme
    if (rootNode.children) {
      const sortedRootChildren = rootNode.children
        .filter(node => node.size > 0)
        .sort((a, b) => b.size - a.size)

      // Check if we're at disk root and need to add available space
      const isDiskRoot = diskInfo !== null
      const scannedSize = sortedRootChildren.reduce((sum, node) => sum + node.size, 0)


      // For disk root, total = scanned + available space
      // For folders, total = scanned only
      const totalSize = isDiskRoot ? scannedSize + diskInfo.availableSpace : scannedSize
      let currentAngle = 0

      sortedRootChildren.forEach((node, index) => {
        const proportion = node.size / totalSize
        const nodeAngleRange = 360 * proportion
        const nodeEndAngle = currentAngle + nodeAngleRange

        const colorScheme = COLOR_SCHEMES[index % COLOR_SCHEMES.length]
        const color = colorScheme[0]

        if (!layers.has(0)) {
          layers.set(0, [])
        }

        layers.get(0)!.push({
          name: node.name,
          value: node.size,
          color: color,
          path: node.path,
          node: node,
          startAngle: currentAngle,
          endAngle: nodeEndAngle,
        })

        // Process children
        if (node.isDirectory && node.children && node.children.length > 0) {
          buildHierarchy(node.children, 1, currentAngle, nodeEndAngle, index)
        }

        currentAngle = nodeEndAngle
      })

      // Add available space for disk root
      if (isDiskRoot && diskInfo.availableSpace > 0) {
        if (!layers.has(0)) {
          layers.set(0, [])
        }

        const availableProportion = diskInfo.availableSpace / totalSize
        const availableAngleRange = 360 * availableProportion
        const availableEndAngle = currentAngle + availableAngleRange

        layers.get(0)!.push({
          name: '可用空間',
          value: diskInfo.availableSpace,
          color: 'rgba(200, 200, 200, 0.3)', // Transparent gray
          path: '',
          node: {
            name: '可用空間',
            size: diskInfo.availableSpace,
            path: '',
            isDirectory: false
          },
          startAngle: currentAngle,
          endAngle: availableEndAngle,
        })
      }
    }

    // Convert map to array of layers
    const result: LayerData[] = []
    layers.forEach((data, depth) => {
      const innerRadius = 60 + (depth * layerThickness)
      const outerRadius = innerRadius + layerThickness - 3

      result.push({
        data,
        innerRadius,
        outerRadius,
        depth,
      })
    })

    return result.sort((a, b) => a.depth - b.depth)
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

  // Prepare data (must be before conditional returns)
  const layers = prepareMultiLayerData(currentLevel)
  const chartData = prepareChartData(currentLevel)
  const totalSize = currentLevel?.size || 0

  // Debug output - must be called on every render
  useEffect(() => {
    if (layers.length > 0) {
      console.log('=== Layer Data ===')
      layers.forEach((layer, idx) => {
        console.log(`Layer ${idx} (depth ${layer.depth}):`)
        layer.data.forEach(item => {
          console.log(`  - ${item.name}: ${formatBytes(item.value)} [${item.startAngle?.toFixed(1)}° - ${item.endAngle?.toFixed(1)}°] (${((item.endAngle! - item.startAngle!)).toFixed(1)}°)`)
        })
      })
    }
  }, [layers.length, currentLevel?.path])

  const handlePieClick = (entry: ChartData, index: number) => {
    if (!currentLevel || !currentLevel.children) return

    const clickedNode = currentLevel.children.find(child => child.path === entry.path)
    if (clickedNode && clickedNode.isDirectory && clickedNode.children) {
      setCurrentLevel(clickedNode)
      setBreadcrumb([...breadcrumb, clickedNode])
      setActiveIndex(null)
    }
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">正在掃描資料夾</p>
          </div>

          {scanProgress && scanProgress.filesScanned > 0 && (
            <div className="bg-card rounded-lg border border-border p-6 space-y-4">
              {/* Progress bar - only show if we have estimated total (disk root) */}
              {scanProgress.estimatedTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-muted-foreground">掃描進度</span>
                    <span className="font-mono text-primary font-semibold">
                      {Math.min(100, Math.round((scanProgress.scannedSize / scanProgress.estimatedTotal) * 100))}%
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                      style={{
                        width: `${Math.min(100, (scanProgress.scannedSize / scanProgress.estimatedTotal) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">已掃描項目</p>
                  <p className="text-2xl font-bold text-foreground font-mono">
                    {scanProgress.filesScanned.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">已掃描大小</p>
                  <p className="text-2xl font-bold text-foreground font-mono">
                    {formatBytes(scanProgress.scannedSize)}
                  </p>
                </div>
              </div>

              {/* Current path */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">當前路徑</p>
                <p className="text-sm text-foreground font-mono truncate" title={scanProgress.currentPath}>
                  {scanProgress.currentPath}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleGoBack = () => {
    if (breadcrumb.length > 1) {
      const newBreadcrumb = breadcrumb.slice(0, -1)
      setBreadcrumb(newBreadcrumb)
      setCurrentLevel(newBreadcrumb[newBreadcrumb.length - 1])
      setActiveIndex(null)
    }
  }


  return (
    <div className="min-h-screen p-8">
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

        {/* Debug Info */}
        <div className="bg-card rounded-lg border border-border p-4">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-muted-foreground">Debug Info (Click to expand)</summary>
            <div className="mt-3 space-y-2 text-xs font-mono">
              {layers.map((layer, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-3">
                  <div className="font-bold text-foreground">Layer {idx} (Depth {layer.depth}):</div>
                  {layer.data.map((item, itemIdx) => (
                    <div key={itemIdx} className="ml-2 text-muted-foreground">
                      • {item.name}: {formatBytes(item.value)}
                      <span className="text-primary ml-2">
                        [{item.startAngle?.toFixed(1)}° → {item.endAngle?.toFixed(1)}°]
                      </span>
                      <span className="text-secondary ml-1">
                        ({((item.endAngle! - item.startAngle!)).toFixed(1)}°)
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Nested Storage Distribution</h2>
            {layers.length > 0 ? (
              <div className="relative">
                <div className="relative z-10">
                  <svg width="100%" height={500} viewBox="0 0 500 500">
                    {layers.map((layer, layerIndex) => {
                      const centerX = 250
                      const centerY = 250

                      return (
                        <g key={`layer-${layerIndex}`}>
                          {layer.data.map((item, index) => {
                            const angleRange = (item.endAngle || 0) - (item.startAngle || 0)

                            // Special case: full circle (360°)
                            if (Math.abs(angleRange - 360) < 0.01) {
                              return (
                                <g key={`sector-${layerIndex}-${index}`}>
                                  <circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={layer.outerRadius}
                                    fill={item.color}
                                    stroke="rgba(0,0,0,0.1)"
                                    strokeWidth={0.5}
                                  />
                                  <circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={layer.innerRadius}
                                    fill="white"
                                  />
                                  <circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={(layer.innerRadius + layer.outerRadius) / 2}
                                    fill="transparent"
                                    strokeWidth={layer.outerRadius - layer.innerRadius}
                                    stroke={item.color}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      if (item.node.isDirectory && item.node.children) {
                                        setCurrentLevel(item.node)
                                        setBreadcrumb([...breadcrumb, item.node])
                                      }
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.opacity = '0.8'
                                      setActiveIndex(index)
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.opacity = '1'
                                      setActiveIndex(null)
                                    }}
                                  >
                                    <title>
                                      {item.node.isDirectory ? '📁 Folder' : '📄 File'}: {item.name} - {formatBytes(item.value)}
                                    </title>
                                  </circle>
                                </g>
                              )
                            }

                            const startAngle = (item.startAngle || 0) - 90
                            const endAngle = (item.endAngle || 0) - 90
                            const startRad = (startAngle * Math.PI) / 180
                            const endRad = (endAngle * Math.PI) / 180

                            const x1 = centerX + layer.innerRadius * Math.cos(startRad)
                            const y1 = centerY + layer.innerRadius * Math.sin(startRad)
                            const x2 = centerX + layer.outerRadius * Math.cos(startRad)
                            const y2 = centerY + layer.outerRadius * Math.sin(startRad)
                            const x3 = centerX + layer.outerRadius * Math.cos(endRad)
                            const y3 = centerY + layer.outerRadius * Math.sin(endRad)
                            const x4 = centerX + layer.innerRadius * Math.cos(endRad)
                            const y4 = centerY + layer.innerRadius * Math.sin(endRad)

                            const largeArc = endAngle - startAngle > 180 ? 1 : 0

                            const pathData = [
                              `M ${x1} ${y1}`,
                              `L ${x2} ${y2}`,
                              `A ${layer.outerRadius} ${layer.outerRadius} 0 ${largeArc} 1 ${x3} ${y3}`,
                              `L ${x4} ${y4}`,
                              `A ${layer.innerRadius} ${layer.innerRadius} 0 ${largeArc} 0 ${x1} ${y1}`,
                              'Z'
                            ].join(' ')

                            return (
                              <path
                                key={`sector-${layerIndex}-${index}`}
                                d={pathData}
                                fill={item.color}
                                stroke="rgba(0,0,0,0.1)"
                                strokeWidth={0.5}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  if (item.node.isDirectory && item.node.children) {
                                    setCurrentLevel(item.node)
                                    setBreadcrumb([...breadcrumb, item.node])
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.8'
                                  setActiveIndex(index)
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1'
                                  setActiveIndex(null)
                                }}
                              >
                                <title>
                                  {item.node.isDirectory ? '📁 Folder' : '📄 File'}: {item.name} - {formatBytes(item.value)}
                                </title>
                              </path>
                            )
                          })}
                        </g>
                      )
                    })}
                  </svg>
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
