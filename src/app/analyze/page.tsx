'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { invoke, Channel } from '@tauri-apps/api/core'
import { getFileTypeInfo } from '@/lib/fileTypeUtils'
import { updateStats } from '@/lib/statsStorage'
import { useVirtualizer } from '@tanstack/react-virtual'

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
  isTinyNode?: boolean // True if this node is merged into "其他" in the chart
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

// Simple hash function to generate unique ID for each sector
function generateSectorId(path: string, depth: number): string {
  const str = `${path}-${depth}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

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
  const k = 1000
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function formatBytesCompact(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1000
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)

  // Always show 4 digits total (with decimals to fill)
  if (value >= 1000) {
    return `${Math.round(value)} ${sizes[i]}`
  } else if (value >= 100) {
    return `${value.toFixed(1)} ${sizes[i]}`
  } else if (value >= 10) {
    return `${value.toFixed(2)} ${sizes[i]}`
  } else {
    return `${value.toFixed(2)} ${sizes[i]}`
  }
}

function rebuildTreeFromCompactNodes(rootNode: FileNode, compactNodes: any[]): FileNode {
  const nodeMap = new Map<string, FileNode>()

  const rootPathNormalized = rootNode.path.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '')

  const rootCopy = { ...rootNode }
  nodeMap.set(rootPathNormalized, rootCopy)

  compactNodes.forEach((compactNode, index) => {
    expandAndAddToMap(compactNode, rootNode.path, nodeMap)
  })

  const childrenMap = new Map<string, FileNode[]>()


  nodeMap.forEach((node, normalizedPath) => {
    if (normalizedPath === rootPathNormalized) {
      return
    }

    const lastSlashIndex = normalizedPath.lastIndexOf('/')
    let parentPath: string

    if (lastSlashIndex <= 0) {
      parentPath = rootPathNormalized
    } else {
      parentPath = normalizedPath.substring(0, lastSlashIndex)

      if (parentPath.length === 2 && parentPath.endsWith(':')) {
        parentPath = rootPathNormalized
      }
    }

    if (!childrenMap.has(parentPath)) {
      childrenMap.set(parentPath, [])
    }
    childrenMap.get(parentPath)!.push(node)
  })

  let assignedCount = 0
  nodeMap.forEach((node, normalizedPath) => {
    const children = childrenMap.get(normalizedPath) || []
    if (children.length > 0) {
      node.children = children
      assignedCount++
    } else {
      node.children = []
    }
  })

  const result = nodeMap.get(rootPathNormalized)

  return result || rootNode
}

function expandAndAddToMap(compactNode: any, parentPath: string, nodeMap: Map<string, FileNode>) {
  let nodePath: string
  if (parentPath.endsWith('\\') || parentPath.endsWith('/')) {
    nodePath = `${parentPath}${compactNode.n}`
  } else {
    nodePath = `${parentPath}\\${compactNode.n}`
  }

  const normalizedPath = nodePath.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '')

  const node: FileNode = {
    name: compactNode.n,
    size: compactNode.s,
    path: nodePath,
    isDirectory: compactNode.d,
    children: []
  }

  nodeMap.set(normalizedPath, node)

  if (compactNode.c && Array.isArray(compactNode.c)) {
    compactNode.c.forEach((child: any) => {
      expandAndAddToMap(child, nodePath, nodeMap)
    })
  }
}

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const path = searchParams.get('path')

  const [data, setData] = useState<FileNode | null>(null)
  const [currentLevel, setCurrentLevel] = useState<FileNode | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [scanProgress, setScanProgress] = useState<{ currentPath: string; filesScanned: number; scannedSize: number; estimatedTotal: number } | null>(null)
  const [diskInfo, setDiskInfo] = useState<{ totalSpace: number; availableSpace: number; usedSpace: number } | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scanStartTime, setScanStartTime] = useState<number | null>(null)
  const [scanElapsedTime, setScanElapsedTime] = useState<number>(0)
  const [scanCompleteTime, setScanCompleteTime] = useState<number | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [scanSummary, setScanSummary] = useState<{ filesScanned: number; totalSize: number; duration: number } | null>(null)

  // Use ref to track component state
  const scanningRef = useRef(false)
  const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cache compact nodes from batches
  const compactNodesCache = useRef<any[]>([])

  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; label: string; size: string; icon: any; color: string } | null>(null)

  // Hover handlers with smart positioning
  const tooltipRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)

  const calculateTooltipPosition = (mouseX: number, mouseY: number) => {
    const offsetX = 8
    const offsetY = 8

    // Use actual tooltip dimensions if available, otherwise use estimates
    const tooltipWidth = tooltipRef.current?.offsetWidth || 200
    const tooltipHeight = tooltipRef.current?.offsetHeight || 70

    // Check if mouse is on left or right half of screen
    const isLeftHalf = mouseX < window.innerWidth / 2
    // Check if mouse is on top or bottom half of screen
    const isTopHalf = mouseY < window.innerHeight / 2

    let x = isLeftHalf ? mouseX + offsetX : mouseX - tooltipWidth - offsetX
    let y = isTopHalf ? mouseY + offsetY : mouseY - tooltipHeight - offsetY

    return { x, y }
  }

  const handleHover = (sectorId: string, event: React.MouseEvent, label: string, name: string, size: string, icon: any, color: string) => {
    setHoveredSectorId(sectorId)
    const pos = calculateTooltipPosition(event.clientX, event.clientY)
    setTooltip({
      x: pos.x,
      y: pos.y,
      content: name,
      label: label,
      size: size,
      icon: icon,
      color: color
    })
  }
  const handleMouseMove = (event: React.MouseEvent) => {
    if (tooltip) {
      const pos = calculateTooltipPosition(event.clientX, event.clientY)
      setTooltip(prev => prev ? { ...prev, x: pos.x, y: pos.y } : null)
    }
  }
  const handleLeave = () => {
    setHoveredSectorId(null)
    setTooltip(null)
  }

  const handleCancelScan = async () => {
    try {
      console.log('🛑 Cancelling scan...')
      await invoke('cancel_scan')
      console.log('✅ Scan cancelled successfully')
      setIsLoading(false)
      setScanProgress(null)
      router.back()
    } catch (error) {
      console.error('❌ 取消掃描失敗:', error)
    }
  }

  // Mouse tracking for cursor glow effect
  useEffect(() => {
    let animationFrame: number

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [])

  // Sync hover states between chart and file list
  useEffect(() => {
    if (!svgRef.current) return

    const updateElements = (elements: NodeListOf<Element>, className: string) => {
      elements.forEach(element => {
        const sectorId = element.getAttribute('data-sector-id')
        element.classList.remove('hovered', 'dimmed')

        if (hoveredSectorId && sectorId === hoveredSectorId) {
          element.classList.add('hovered')
        } else if (hoveredSectorId) {
          element.classList.add('dimmed')
        }
      })
    }

    // Update chart sectors
    updateElements(svgRef.current.querySelectorAll('.chart-sector'), 'chart-sector')

    // Update file list items
    const fileListContainer = document.querySelector('.file-list')
    if (fileListContainer) {
      updateElements(fileListContainer.querySelectorAll('.file-item'), 'file-item')
    }
  }, [hoveredSectorId])

  useEffect(() => {
    if (!path) return

    // Prevent duplicate scans
    if (scanningRef.current) return

    const scanFolder = async () => {
      try {
        scanningRef.current = true
        setIsLoading(true)
        setScanProgress({ currentPath: path, filesScanned: 0, scannedSize: 0, estimatedTotal: 0 })

        // Start timer
        const startTime = Date.now()
        setScanStartTime(startTime)
        setScanElapsedTime(0)
        setScanCompleteTime(null)

        // Update elapsed time every 100ms
        elapsedTimeIntervalRef.current = setInterval(() => {
          setScanElapsedTime(Date.now() - startTime)
        }, 100)

        // Create channel for streaming batches
        const onBatch = new Channel<{
          nodes: FileNode[];
          compact_nodes?: any[];  // Batch of compact nodes
          total_scanned: number;
          total_size: number;
          is_complete: boolean;
          root_node?: FileNode;
          compact_root?: any;  // Compact format from backend
          disk_info?: { total_space: number; available_space: number; used_space: number };
          current_path?: string
        }>()
        onBatch.onmessage = (message) => {
          // Cache compact nodes from batches
          if (message.compact_nodes && message.compact_nodes.length > 0) {
            compactNodesCache.current.push(...message.compact_nodes)
          }

          // Update progress with disk_info if available
          setScanProgress(prev => ({
            currentPath: message.current_path || path,
            filesScanned: message.total_scanned,
            scannedSize: message.total_size,
            estimatedTotal: message.disk_info ? message.disk_info.used_space : (prev?.estimatedTotal || 0)
          }))

          // If complete, rebuild tree from cached compact nodes
          if (message.is_complete) {
            if (!message.root_node) {
              console.error('ERROR: is_complete=true but no root_node!')
              return
            }

            // Stop timer
            if (elapsedTimeIntervalRef.current) {
              clearInterval(elapsedTimeIntervalRef.current)
              elapsedTimeIntervalRef.current = null
            }

            // Record completion time
            const completionTime = Date.now() - (scanStartTime || Date.now())
            setScanCompleteTime(completionTime)

            // Rebuild tree from cached compact nodes
            const finalTree = rebuildTreeFromCompactNodes(message.root_node, compactNodesCache.current)

            setData(finalTree)
            setCurrentLevel(finalTree)
            setBreadcrumb([finalTree])
            setDiskInfo(message.disk_info ? {
              totalSpace: message.disk_info.total_space,
              availableSpace: message.disk_info.available_space,
              usedSpace: message.disk_info.used_space
            } : null)

            // 更新累計統計數據
            updateStats(message.total_scanned, message.total_size)

            // Clear cache
            compactNodesCache.current = []

            // Show summary screen
            setScanSummary({
              filesScanned: message.total_scanned,
              totalSize: message.total_size,
              duration: completionTime
            })
            setShowSummary(true)
            setScanProgress(null)
          }
        }

        // Start streaming scan (returns immediately, scanning in background)
        await invoke('scan_directory_streaming', { path, onBatch })
      } catch (error) {
        console.error('Scan failed:', error)
        setIsLoading(false)
        setScanProgress(null)
        // Stop timer on error
        if (elapsedTimeIntervalRef.current) {
          clearInterval(elapsedTimeIntervalRef.current)
          elapsedTimeIntervalRef.current = null
        }
      } finally {
        scanningRef.current = false
      }
    }

    scanFolder()
  }, [path])

  // Format time in seconds
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    } else if (minutes > 0) {
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
    } else {
      return `${seconds}s`
    }
  }

  // Calculate estimated remaining time based on progress
  const calculateRemainingTime = (): string | null => {
    if (!scanProgress || !scanStartTime || scanProgress.estimatedTotal === 0 || scanProgress.scannedSize === 0) {
      return null
    }

    const elapsed = scanElapsedTime
    const progress = scanProgress.scannedSize / scanProgress.estimatedTotal

    if (progress <= 0) return null

    const estimatedTotal = elapsed / progress
    const remaining = estimatedTotal - elapsed

    if (remaining < 0) return null

    return formatTime(remaining)
  }

  // Helper functions must be defined before use
  const prepareMultiLayerData = (rootNode: FileNode | null, maxDepth: number = 10): LayerData[] => {
    if (!rootNode || !rootNode.children) return []

    const layers: Map<number, ChartData[]> = new Map()
    const layerThickness = 18

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

        // Filter out items with angle less than 2 degrees (except for innermost layer - depth 0)
        if (depth > 0 && nodeAngleRange < 2) {
          currentAngle = nodeEndAngle
          return
        }

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

      // Check if we're at disk root (comparing with the initial scanned data node)
      // Only show available space if viewing the root node that was initially scanned
      const isDiskRoot = diskInfo !== null && rootNode === data
      const scannedSize = sortedRootChildren.reduce((sum, node) => sum + node.size, 0)

      // For disk root, total = total disk space (from diskInfo)
      // For folders, total = scanned only
      const totalSize = isDiskRoot ? diskInfo.totalSpace : scannedSize
      // Calculate logical available space: total - scanned
      const logicalAvailableSpace = isDiskRoot ? diskInfo.totalSpace - scannedSize : 0
      let currentAngle = 0

      // Separate nodes: >= 1 degree vs < 1 degree
      const mainNodes: FileNode[] = []
      const tinyNodes: FileNode[] = []

      sortedRootChildren.forEach((node) => {
        const proportion = node.size / totalSize
        const nodeAngleRange = 360 * proportion

        if (nodeAngleRange >= 1) {
          mainNodes.push(node)
        } else {
          tinyNodes.push(node)
        }
      })

      // Process main nodes (>= 1 degree)
      mainNodes.forEach((node, index) => {
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

      // Merge tiny nodes (< 1 degree) into "其他"
      if (tinyNodes.length > 0) {
        const othersTotalSize = tinyNodes.reduce((sum, node) => sum + node.size, 0)
        const othersProportion = othersTotalSize / totalSize
        const othersAngleRange = 360 * othersProportion
        const othersEndAngle = currentAngle + othersAngleRange

        if (!layers.has(0)) {
          layers.set(0, [])
        }

        // Create virtual "其他" node
        layers.get(0)!.push({
          name: `其他 (${tinyNodes.length} 項)`,
          value: othersTotalSize,
          color: 'rgba(128, 128, 128, 0.6)', // Gray color
          path: '__others__',
          node: {
            name: `其他 (${tinyNodes.length} 項)`,
            size: othersTotalSize,
            path: '__others__',
            isDirectory: false,
            children: []
          },
          startAngle: currentAngle,
          endAngle: othersEndAngle,
        })

        // Process children of tiny nodes within the "其他" angle range
        // Use a special colorIndex to differentiate them
        let tinyNodeAngle = currentAngle
        tinyNodes.forEach((node) => {
          const proportion = node.size / othersTotalSize
          const nodeAngleRange = othersAngleRange * proportion
          const nodeEndAngle = tinyNodeAngle + nodeAngleRange

          if (node.isDirectory && node.children && node.children.length > 0) {
            buildHierarchy(node.children, 1, tinyNodeAngle, nodeEndAngle, COLOR_SCHEMES.length - 1)
          }

          tinyNodeAngle = nodeEndAngle
        })

        currentAngle = othersEndAngle
      }

      // Add available space for disk root
      if (isDiskRoot && diskInfo.availableSpace > 0) {
        if (!layers.has(0)) {
          layers.set(0, [])
        }

        const availableProportion = logicalAvailableSpace / totalSize
        const availableAngleRange = 360 * availableProportion
        const availableEndAngle = currentAngle + availableAngleRange

        layers.get(0)!.push({
          name: '可用空間',
          value: logicalAvailableSpace,
          color: 'rgba(128, 128, 128, 0.4)', // Semi-transparent gray
          path: '',
          node: {
            name: '可用空間',
            size: logicalAvailableSpace,
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
      const innerRadius = 40 + (depth * layerThickness)
      const outerRadius = innerRadius + layerThickness - 2

      result.push({
        data,
        innerRadius,
        outerRadius,
        depth,
      })
    })

    return result.sort((a, b) => a.depth - b.depth)
  }

  // Prepare list data (for file list - shows all items)
  const prepareListData = (node: FileNode | null): ChartData[] => {
    if (!node || !node.children) return []

    const sortedChildren = node.children
      .filter(child => child.size > 0)
      .sort((a, b) => b.size - a.size)

    // Calculate if viewing disk root
    const isDiskRoot = diskInfo !== null && node === data
    const scannedSize = sortedChildren.reduce((sum, child) => sum + child.size, 0)
    const totalSize = isDiskRoot ? scannedSize + diskInfo.availableSpace : scannedSize

    return sortedChildren.map((child, index) => {
      const proportion = child.size / totalSize
      const nodeAngleRange = 360 * proportion
      const isTinyNode = nodeAngleRange < 1

      return {
        name: child.name,
        value: child.size,
        color: COLORS[index % COLORS.length],
        path: child.path,
        node: child,
        isTinyNode, // Mark if this should be grouped in "其他"
      }
    })
  }

  // Prepare data (must be before conditional returns)
  const layers = prepareMultiLayerData(currentLevel)
  const listData = prepareListData(currentLevel)

  // Virtual list using TanStack Virtual
  const rowVirtualizer = useVirtualizer({
    count: listData.length,
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => 52,
    overscan: 5,
  })

  // Helper function to find a node's parent chain from root
  const findNodePath = (root: FileNode, targetPath: string): FileNode[] | null => {
    const normalizedTarget = targetPath.replace(/\\/g, '/')
    const normalizedRootPath = root.path.replace(/\\/g, '/')

    if (normalizedRootPath === normalizedTarget) {
      return [root]
    }

    if (!root.children) return null

    for (const child of root.children) {
      const normalizedChildPath = child.path.replace(/\\/g, '/')
      if (normalizedChildPath === normalizedTarget) {
        return [root, child]
      }

      const childPath = findNodePath(child, targetPath)
      if (childPath) {
        return [root, ...childPath]
      }
    }

    return null
  }

  // Helper function to navigate to a node (used by both chart and file list)
  const navigateToNode = (targetNode: FileNode) => {
    if (!targetNode.isDirectory || !targetNode.children) return

    // Check if node is a direct child of current level (most common case)
    if (currentLevel?.children?.some(child => child.path === targetNode.path)) {
      setBreadcrumb([...breadcrumb, targetNode])
      setCurrentLevel(targetNode)
      return
    }

    // Otherwise, find the full path from root
    if (data) {
      const fullPath = findNodePath(data, targetNode.path)
      if (fullPath) {
        setBreadcrumb(fullPath)
        setCurrentLevel(targetNode)
      } else {
        setBreadcrumb([...breadcrumb, targetNode])
        setCurrentLevel(targetNode)
      }
    }
  }

  const handlePieClick = (entry: ChartData) => {
    if (!entry.node || entry.name === '可用空間' || entry.path === '__others__') return
    navigateToNode(entry.node)
  }

  if (!path) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">未選擇資料夾</p>
      </div>
    )
  }

  // Show summary screen after scan completes
  if (showSummary && scanSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center relative overflow-hidden p-4">
        {/* Background Tech Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-primary/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-2xl space-y-6 relative z-20">
          {/* Success Icon */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 backdrop-blur-md border-2 border-emerald-500/50 mb-4 animate-in zoom-in duration-500">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">掃描完成！</h2>
            <p className="text-muted-foreground">已完成資料夾分析，以下是掃描結果</p>
          </div>

          {/* Summary Card */}
          <div className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-6 space-y-6 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <div className="text-center space-y-2 p-4 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">掃描項目</p>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {scanSummary.filesScanned.toLocaleString()}
                </p>
              </div>
              <div className="text-center space-y-2 p-4 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">總大小</p>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {formatBytes(scanSummary.totalSize)}
                </p>
              </div>
              <div className="text-center space-y-2 p-4 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">耗時</p>
                <p className="text-3xl font-bold text-primary font-mono">
                  {formatTime(scanSummary.duration)}
                </p>
              </div>
            </div>

            {/* Disk Info */}
            {diskInfo && (
              <div className="pt-4 border-t border-border/50 relative z-10">
                <p className="text-sm text-muted-foreground mb-3">硬碟資訊</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">總容量</span>
                    <span className="text-sm font-mono text-foreground">{formatBytes(diskInfo.totalSpace)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">已使用</span>
                    <span className="text-sm font-mono text-foreground">{formatBytes(diskInfo.usedSpace)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">可用空間</span>
                    <span className="text-sm font-mono text-foreground">{formatBytes(diskInfo.availableSpace)}</span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-muted/50 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(diskInfo.usedSpace / diskInfo.totalSpace) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-4 border-t border-border/50 relative z-10 flex justify-center">
              <button
                onClick={() => {
                  setShowSummary(false)
                  setIsLoading(false)
                }}
                className="bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-md rounded-lg border-2 border-primary/50 px-6 py-3 flex items-center gap-3 hover:from-primary/30 hover:to-primary/15 hover:border-primary/70 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-primary/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="text-base font-semibold text-primary relative z-10">查看分析結果</span>
                <svg className="w-5 h-5 text-primary relative z-10 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center relative overflow-hidden p-4">
        {/* Background Tech Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-primary/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        {/* Cursor Follow Glow */}
        <div
          className="fixed pointer-events-none z-10"
          style={{
            left: mousePosition.x - 150,
            top: mousePosition.y - 150,
            width: '300px',
            height: '300px',
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
          }}
        >
          <div className="w-full h-full bg-primary/8 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-2xl space-y-6 relative z-20">
          <div className="text-center space-y-2">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">正在掃描資料夾</p>
            <p className="text-sm text-muted-foreground">檔案較多時可能會需要較長時間，請耐心等待</p>
          </div>

          {scanProgress && scanProgress.filesScanned > 0 && (
            <div className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-6 space-y-4 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Progress bar - only show for root directory scans */}
              {scanProgress.estimatedTotal > 0 && (() => {
                const percentage = (scanProgress.scannedSize / scanProgress.estimatedTotal) * 100;
                const displayPercentage = Math.min(100, percentage);
                return (
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-muted-foreground">掃描進度</span>
                      <span className="font-mono text-primary font-semibold">
                        {Math.round(displayPercentage)}%
                      </span>
                    </div>
                    <div className="w-full">
                      <progress
                        value={displayPercentage}
                        max={100}
                        className="progress-blue w-full"
                        aria-label="掃描進度"
                      />
                    </div>
                    {scanProgress.scannedSize > scanProgress.estimatedTotal && (
                      <p className="text-xs text-muted-foreground">注意：實際大小可能因硬連結等因素超過預估</p>
                    )}
                  </div>
                );
              })()}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 relative z-10">
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

              {/* Time stats */}
              <div className="grid grid-cols-2 gap-4 relative z-10 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">已耗時</p>
                  <p className="text-xl font-bold text-primary font-mono">
                    {scanCompleteTime ? formatTime(scanCompleteTime) : formatTime(scanElapsedTime)}
                  </p>
                </div>
                {!scanCompleteTime && (() => {
                  const remainingTime = calculateRemainingTime()
                  return remainingTime ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">預估剩餘</p>
                      <p className="text-xl font-bold text-primary font-mono">
                        {remainingTime}
                      </p>
                    </div>
                  ) : null
                })()}
                {scanCompleteTime && (
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ 掃描完成</p>
                    <p className="text-sm text-muted-foreground">
                      即將進入分析...
                    </p>
                  </div>
                )}
              </div>

              {/* Current path */}
              <div className="pt-4 border-t border-border relative z-10">
                <p className="text-xs text-muted-foreground mb-1">目前掃描路徑</p>
                <p
                  className="text-sm text-foreground font-mono overflow-hidden text-ellipsis"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.5rem',
                    height: '3rem',
                    wordBreak: 'break-all'
                  }}
                  title={scanProgress.currentPath}
                >
                  {scanProgress.currentPath}
                </p>
              </div>

              {/* Cancel button */}
              <div className="pt-4 border-t border-border relative z-10 flex justify-center">
                <button
                  onClick={handleCancelScan}
                  className="bg-gradient-to-br from-destructive/20 to-destructive/10 backdrop-blur-md rounded-lg border-2 border-destructive/50 px-4 py-2 flex items-center gap-2 hover:from-destructive/30 hover:to-destructive/15 hover:border-destructive/70 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-destructive/20 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 via-destructive/20 to-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-destructive/30 to-destructive/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <X className="w-4 h-4 text-destructive relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-sm font-semibold text-destructive relative z-10">取消掃描</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }


  // Generate breadcrumb path segments from breadcrumb array
  const generateBreadcrumbSegments = () => {
    if (breadcrumb.length === 0) return []

    return breadcrumb.map((node, index) => {
      const isLast = index === breadcrumb.length - 1
      const pathParts = node.path.replace(/\\/g, '/').split('/').filter(Boolean)
      const name = pathParts[pathParts.length - 1] || 'Root'

      return {
        name,
        path: node.path,
        isClickable: !isLast // Only last segment is not clickable
      }
    })
  }

  // Handle breadcrumb click
  const handleBreadcrumbClick = (targetPath: string) => {
    // First try to find in current breadcrumb
    const targetIndex = breadcrumb.findIndex(node => {
      const normalizedNodePath = node.path.replace(/\\/g, '/')
      const normalizedTargetPath = targetPath.replace(/\\/g, '/')
      return normalizedNodePath === normalizedTargetPath
    })

    if (targetIndex !== -1) {
      const newBreadcrumb = breadcrumb.slice(0, targetIndex + 1)
      setBreadcrumb(newBreadcrumb)
      setCurrentLevel(breadcrumb[targetIndex])
      return
    }

    // If not in breadcrumb, find from root
    if (data) {
      const fullPath = findNodePath(data, targetPath)
      if (fullPath) {
        setBreadcrumb(fullPath)
        setCurrentLevel(fullPath[fullPath.length - 1])
      }
    }
  }

  return (
    <div className="w-[840px] h-[630px] bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden flex flex-col relative">
      {/* Background Tech Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-primary/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      {/* Cursor Follow Glow */}
      <div
        className="fixed pointer-events-none z-10"
        style={{
          left: mousePosition.x - 150,
          top: mousePosition.y - 150,
          width: '300px',
          height: '300px',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
        }}
      >
        <div className="w-full h-full bg-primary/8 rounded-full blur-3xl"></div>
      </div>

      <style jsx>{`
        @keyframes layerFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        /* JavaScript controlled hover effects with CSS transitions */
        .chart-sector {
          transition: opacity 0.15s ease;
          cursor: pointer;
        }

        .chart-sector.hovered {
          opacity: 1 !important;
        }

        .chart-sector.dimmed {
          opacity: 0.15 !important;
        }
        
        .file-item {
          transition: opacity 0.15s ease, background-color 0.15s ease;
          cursor: pointer;
        }
        
        .file-item.hovered {
          background-color: rgba(239, 68, 68, 0.05) !important;
        }

        .file-item.dimmed {
          opacity: 0.3 !important;
        }

      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-md border-b border-border/50 px-3 py-2 shadow-sm flex-shrink-0 relative z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
            Home
          </button>
        </div>
        <h1 className="text-sm font-bold text-foreground">ExpTech Studio</h1>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-card/60 backdrop-blur-md border-b border-border/50 px-3 py-2 flex-shrink-0 relative z-20">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">Path:</span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {generateBreadcrumbSegments().map((segment, index) => (
              <div key={index} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span className="text-[10px] text-muted-foreground">/</span>
                )}
                <button
                  onClick={() => segment.isClickable && handleBreadcrumbClick(segment.path)}
                  className={`text-xs font-mono transition-all ${
                    segment.isClickable
                      ? 'text-primary hover:text-primary/80 hover:bg-primary/5 px-1.5 py-0.5 rounded'
                      : 'text-foreground font-semibold'
                  }`}
                  disabled={!segment.isClickable}
                  title={segment.path}
                >
                  {segment.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[1fr_260px] overflow-hidden relative z-20">
        <div className="bg-card/60 backdrop-blur-md border-r border-border/50 p-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-0.5 h-3 bg-primary rounded-full"></span>
              Storage Distribution
            </h2>
            <div className="text-xs font-bold text-foreground truncate max-w-[200px]">
              {currentLevel === data && diskInfo
                ? (currentLevel?.name || path?.split('\\').pop() || path?.split('/').pop() || 'Disk')
                : (currentLevel?.name || 'Total')
              }
            </div>
          </div>
          {layers.length > 0 ? (
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <svg
                ref={svgRef}
                key={currentLevel?.path || 'root'}
                width="100%"
                height="100%"
                viewBox="0 0 500 500"
                className="chart-container max-h-full transition-all duration-500 ease-in-out"
                style={{
                  opacity: 1,
                  transform: 'scale(1)'
                }}
                onMouseLeave={handleLeave}
              >
                    {/* Center size display */}
                    <text
                      x="250"
                      y="245"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground transition-all duration-300"
                      style={{ fontSize: '18px', fontWeight: 'bold' }}
                    >
                      {formatBytesCompact(currentLevel?.size || 0).split(' ')[0]}
                    </text>
                    <text
                      x="250"
                      y="265"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground transition-all duration-300"
                      style={{ fontSize: '14px', fontWeight: '500' }}
                    >
                      {formatBytesCompact(currentLevel?.size || 0).split(' ')[1]}
                    </text>
                    {layers.map((layer, layerIndex) => {
                      const centerX = 250
                      const centerY = 250

                      return (
                        <g key={`layer-${layerIndex}`}>
                          {layer.data.map((item, index) => {
                            const angleRange = (item.endAngle || 0) - (item.startAngle || 0)
                            const sectorId = generateSectorId(item.path, layer.depth)

                            // Special case: full circle (360°)
                            if (Math.abs(angleRange - 360) < 0.01) {
                              const radius = (layer.innerRadius + layer.outerRadius) / 2

                              return (
                                <g key={`sector-${layerIndex}-${index}`}>
                                  <circle
                                    cx={centerX}
                                    cy={centerY}
                                    r={radius}
                                    fill="transparent"
                                    strokeWidth={layer.outerRadius - layer.innerRadius}
                                    stroke={item.color}
                                    className="chart-sector"
                                    data-sector-id={sectorId}
                                    onMouseEnter={(e) => {
                                      const fileTypeInfo = getFileTypeInfo(item.name, item.node.isDirectory)
                                      handleHover(sectorId, e, fileTypeInfo.label, item.name, formatBytes(item.value), fileTypeInfo.icon, fileTypeInfo.color)
                                    }}
                                    onMouseMove={handleMouseMove}
                                    style={{
                                      cursor: 'pointer',
                                      animation: `layerFadeIn 0.5s ease-out ${layerIndex * 0.1}s both`
                                    }}
                                    onClick={() => {
                                      if (item.name !== '可用空間') {
                                        navigateToNode(item.node)
                                      }
                                    }}
                                  >
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
                                className="chart-sector"
                                data-sector-id={sectorId}
                                onMouseEnter={(e) => {
                                  const fileTypeInfo = getFileTypeInfo(item.name, item.node.isDirectory)
                                  handleHover(sectorId, e, fileTypeInfo.label, item.name, formatBytes(item.value), fileTypeInfo.icon, fileTypeInfo.color)
                                }}
                                onMouseMove={handleMouseMove}
                                style={{
                                  cursor: 'pointer',
                                  animation: `layerFadeIn 0.5s ease-out ${layerIndex * 0.1}s both`
                                }}
                                onClick={() => {
                                  if (item.name !== '可用空間') {
                                    navigateToNode(item.node)
                                  }
                                }}
                              >
                              </path>
                            )
                          })}
                        </g>
                      )
                    })}
                  </svg>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              Empty folder
            </div>
          )}
        </div>

        <div className="bg-card/60 backdrop-blur-md p-3 flex flex-col overflow-hidden">
          <h2 className="text-xs font-semibold mb-2 text-foreground flex items-center gap-1.5 flex-shrink-0">
            <span className="w-0.5 h-3 bg-primary rounded-full"></span>
            Files & Folders ({listData.length})
          </h2>
          <div
            ref={listContainerRef}
            className="flex-1 file-list overflow-y-auto custom-scrollbar"
            onMouseLeave={handleLeave}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = listData[virtualRow.index]
                const sectorId = item.isTinyNode ? generateSectorId('__others__', 0) : generateSectorId(item.path, 0)
                const fileTypeInfo = getFileTypeInfo(item.name, item.node.isDirectory)
                const IconComponent = fileTypeInfo.icon

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      className="flex items-center justify-between p-2 rounded transition-all duration-300 cursor-pointer border border-transparent file-item hover:bg-card/80 hover:border-primary/20 hover:scale-[1.02] hover:shadow-md group relative overflow-hidden mx-1"
                      data-sector-id={sectorId}
                      onMouseEnter={(e) => handleHover(sectorId, e, fileTypeInfo.label, item.name, formatBytes(item.value), fileTypeInfo.icon, fileTypeInfo.color)}
                      onMouseMove={handleMouseMove}
                      onClick={() => handlePieClick(item)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="flex items-center gap-2 flex-1 min-w-0 relative z-10">
                        <IconComponent
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: fileTypeInfo.color }}
                        />
                        <span className="text-xs font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatBytes(item.value)}
                        </span>
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            zIndex: 999999,
          }}
        >
          <div className="bg-card/90 backdrop-blur-md border-2 border-primary/30 rounded-lg shadow-2xl px-3 py-2 space-y-1 animate-in fade-in duration-200 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-lg"></div>
            <div className="flex items-center gap-2 relative z-10">
              {tooltip.icon && (
                <tooltip.icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: tooltip.color }}
                />
              )}
              <div className="text-xs font-semibold" style={{ color: tooltip.color }}>
                {tooltip.label}
              </div>
            </div>
            <div className="text-sm font-medium text-foreground max-w-[200px] truncate relative z-10">
              {tooltip.content}
            </div>
            <div className="text-xs font-mono text-muted-foreground relative z-10">
              {tooltip.size}
            </div>
          </div>
        </div>
      )}
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
