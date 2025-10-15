import { useEffect, useState } from 'react'

/**
 * 數字增長動畫 Hook
 * @param endValue 目標值
 * @param duration 動畫持續時間（毫秒），默認 1500ms
 * @param startOnMount 是否在組件掛載時立即開始動畫，默認 true
 * @returns 當前動畫值
 */
export function useCountAnimation(
  endValue: number,
  duration: number = 1500,
  startOnMount: boolean = true
): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!startOnMount) return

    // 如果目標值為 0，直接設置
    if (endValue === 0) {
      setCount(0)
      return
    }

    const startTime = Date.now()
    const startValue = 0

    // 使用 easeOutQuart 緩動函數，讓數字增長更自然
    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4)
    }

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 應用緩動函數
      const easedProgress = easeOutQuart(progress)
      const currentValue = Math.floor(startValue + (endValue - startValue) * easedProgress)

      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // 確保最終值精確
        setCount(endValue)
      }
    }

    const animationFrame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [endValue, duration, startOnMount])

  return count
}
