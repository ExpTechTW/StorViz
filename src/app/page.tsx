'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/home')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center justify-center"> 
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">載入中</h1>
        </div>
      </div>
    </div>
  )
}
