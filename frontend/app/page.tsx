"use client"

import { AnalyticsView } from "@/components/dashboard/analytics-view"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function HomePage() {
  return (
    <ProtectedRoute>
      <AnalyticsView />
    </ProtectedRoute>
  )
}
