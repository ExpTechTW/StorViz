'use client'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          StorViz
        </h1>
        <h2 className="text-2xl text-center mb-8 text-muted-foreground">
          儲存空間視覺化分析
        </h2>
        <p className="text-center text-lg">
          歡迎使用 StorViz - 您的儲存空間視覺化分析工具
        </p>
      </div>
    </main>
  )
}
