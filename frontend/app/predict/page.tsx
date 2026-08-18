"use client"

import { PredictView } from "@/components/dashboard/predict-view"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function PredictPage() {
  return (
    <ProtectedRoute>
      <PredictView />
    </ProtectedRoute>
  )
}
