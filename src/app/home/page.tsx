'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen, HardDrive, BarChart3, Shield, Eye, Layers, ArrowLeft } from 'lucide-react'
import { StatsDisplay } from '@/components/StatsDisplay'

// Feature card component
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-3 flex items-center gap-3 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10 w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 shadow-sm">
        <div className="w-4 h-4 flex items-center justify-center text-primary transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showCards, setShowCards] = useState(true)
  const [showButtons, setShowButtons] = useState(false)

  // 縮短路徑顯示 - 智能省略，保留開頭和最後兩個資料夾
  const getDisplayPath = (path: string) => {
    const maxLength = 50
    if (path.length <= maxLength) return path

    const parts = path.split('/').filter(p => p.length > 0) // 過濾空字串
    if (parts.length <= 3) return path

    // 保留第一個部分和最後兩個部分
    const firstPart = parts[0]
    const lastTwo = parts.slice(-2)

    // 計算省略了多少層
    const omittedCount = parts.length - 3

    // Windows 路徑 (例如 C:) 或 Unix 路徑 (例如 Users)
    const prefix = path.startsWith('/') ? '/' : ''

    return `${prefix}${firstPart}/...(${omittedCount})/${lastTwo.join('/')}`
  }

  // Feature data
  const features = [
    { icon: <Eye className="w-3 h-3 text-primary" />, title: '視覺化分析', description: '直觀的圓餅圖顯示' },
    { icon: <Layers className="w-3 h-3 text-primary" />, title: '層次分析', description: '多層資料夾結構' },
    { icon: <Shield className="w-3 h-3 text-primary" />, title: '安全可靠', description: '本地處理保護隱私' }
  ]

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

  // 處理卡片切換動畫 - 1秒淡出後才顯示下一組
  useEffect(() => {
    if (selectedPath) {
      // 選擇路徑後，隱藏 6 個卡片
      setShowCards(false)
      // 1 秒後顯示按鈕組
      const timer = setTimeout(() => {
        setShowButtons(true)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // 清空路徑後，隱藏按鈕組
      setShowButtons(false)
      // 1 秒後顯示 6 個卡片
      const timer = setTimeout(() => {
        setShowCards(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [selectedPath])

  // Event handlers
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select folder to analyze',
      })
      if (selected && typeof selected === 'string') {
        setSelectedPath(selected)
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
    }
  }

  const handleAnalyze = () => {
    if (selectedPath) {
      setIsLoading(true)
      router.push(`/analyze?path=${encodeURIComponent(selectedPath)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center relative overflow-hidden">
      {/* Background Tech Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-primary/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      {/* Cursor Follow Glow - Bottom Layer */}
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

      <div className="relative z-10" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:bg-primary/30 transition-all duration-300"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border border-primary/20 group-hover:border-primary/30 transition-all duration-300">
                <HardDrive className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors duration-300" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              StorViz
            </h1>
            <p className="text-sm text-muted-foreground">
              強大的儲存空間視覺化工具
            </p>
          </div>
        </div>

        {/* 卡片切換容器 */}
        <div className="relative" style={{ minHeight: '200px' }}>
          {/* Statistics & Features - 第一組 */}
          <div className={`space-y-3 ${showCards ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-75 pointer-events-none invisible'}`} style={{ transition: 'opacity 1s ease-in-out, transform 1s ease-in-out, visibility 0s linear 1s' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 200px)', gap: '12px', justifyContent: 'center' }}>
              <StatsDisplay />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 200px)', gap: '12px', justifyContent: 'center' }}>
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 200px)', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleSelectFolder}
                className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-3 flex items-center gap-3 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 shadow-sm">
                  <FolderOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-foreground mb-1">瀏覽資料夾</h3>
                  <p className="text-[10px] text-muted-foreground">選擇分析目標</p>
                </div>
              </button>

              <button
                disabled
                className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-3 flex items-center gap-3 opacity-50 cursor-not-allowed group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0"></div>
                <div className="relative z-10 w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-foreground mb-1">開始分析</h3>
                  <p className="text-[10px] text-muted-foreground">執行掃描任務</p>
                </div>
              </button>
            </div>
          </div>

          {/* 已選擇路徑卡片和按鈕 - 第二組 */}
          <div className={`absolute ${showButtons ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-75 pointer-events-none invisible'}`} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', transition: 'opacity 1s ease-in-out, transform 1s ease-in-out, visibility 0s linear 1s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {selectedPath && (
                <div className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-3 hover:bg-card/80 hover:border-primary/30 transition-all duration-500 hover:shadow-lg group relative overflow-hidden" style={{ width: '412px' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1">已選擇路徑</h3>
                      <p className="text-[11px] text-foreground font-mono leading-relaxed truncate" title={selectedPath}>{getDisplayPath(selectedPath)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPath('')}
                      className="w-8 h-8 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg flex items-center justify-center hover:from-muted/70 hover:to-muted/50 transition-all duration-500 hover:scale-110 hover:rotate-[-8deg] border border-border/30 group/back relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover/back:opacity-100 transition-opacity duration-500"></div>
                      <ArrowLeft className="w-4 h-4 text-foreground relative z-10 transition-transform duration-500 group-hover/back:translate-x-[-2px]" />
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 200px)', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleSelectFolder}
                  className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-3 flex items-center gap-3 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 shadow-sm">
                    <FolderOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold text-foreground mb-1">瀏覽資料夾</h3>
                    <p className="text-[10px] text-muted-foreground">選擇分析目標</p>
                  </div>
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={!selectedPath || isLoading}
                  className="bg-card/60 backdrop-blur-md rounded-lg border border-border/50 p-3 flex items-center gap-3 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 shadow-sm">
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    ) : (
                      <BarChart3 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      {isLoading ? '分析中...' : '開始分析'}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">執行掃描任務</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
