'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen, HardDrive } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <HardDrive className="w-20 h-20 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">StorViz</h1>
          <p className="text-xl text-muted-foreground">
            Storage Space Visualization Tool
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-lg p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select folder to analyze
            </label>
            <div className="flex gap-3">
              <button
                onClick={handleSelectFolder}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
              >
                <FolderOpen className="w-5 h-5" />
                Browse Folder
              </button>
            </div>
            {selectedPath && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground break-all">
                  {selectedPath}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedPath || isLoading}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Start Analysis'}
          </button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Select a folder to scan and analyze its file and subfolder sizes</p>
        </div>
      </div>
    </div>
  )
}
