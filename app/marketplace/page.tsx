'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MarketplaceRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/marketplace')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  )
}
