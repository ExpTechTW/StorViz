'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen, HardDrive, BarChart3, Zap, Shield, Eye, Layers } from 'lucide-react'
import { StatsDisplay } from '@/components/StatsDisplay'

// Feature card component
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-md border border-border/40 p-2 flex items-center gap-2 hover:bg-card/70 transition-all duration-300 hover:scale-[1.02] group">
      <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center p-6 relative overflow-hidden">
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

      <div className="max-w-4xl w-full space-y-8 relative z-10">
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

        {/* Statistics and Features Section - Combined */}
        <div className="grid grid-cols-3 grid-rows-2 gap-2 max-w-2xl mx-auto">
          <StatsDisplay />
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>

        {/* Main Card - Compact & Enhanced */}
        <div className="bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg p-3 space-y-3 hover:shadow-xl transition-all duration-300 max-w-xs mx-auto relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-lg"></div>
          <div className="absolute bottom-0 left-0 w-10 h-10 bg-primary/5 rounded-full blur-md"></div>
          
          <div className="relative z-10 space-y-3">
            <div className="text-center space-y-1">
              <h2 className="text-sm font-bold text-foreground">開始分析</h2>
              <p className="text-[10px] text-muted-foreground">選擇資料夾開始探索</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSelectFolder}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-secondary-foreground rounded-md transition-all duration-300 hover:scale-[1.02] hover:shadow-md border border-border/50 relative group"
              >
                <div className="absolute inset-0 bg-primary/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <FolderOpen className="w-3 h-3 relative z-10" />
                <span className="text-xs font-medium relative z-10">瀏覽資料夾</span>
              </button>

              {selectedPath && (
                <div className="p-2 bg-gradient-to-r from-muted/50 to-muted/30 rounded-md border border-border/30">
                  <p className="text-[10px] text-muted-foreground mb-1">已選擇：</p>
                  <p className="text-[10px] text-foreground font-mono break-all">{selectedPath}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!selectedPath || isLoading}
                className="w-full px-3 py-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-semibold rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100 flex items-center justify-center gap-2 relative group"
              >
                <div className="absolute inset-0 bg-primary-foreground/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin relative z-10"></div>
                    <span className="text-xs relative z-10">分析中...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-3 h-3 relative z-10" />
                    <span className="text-xs relative z-10">開始分析</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
