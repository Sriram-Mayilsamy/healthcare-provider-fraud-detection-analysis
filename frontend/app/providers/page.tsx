"use client"

import { ProvidersView } from "@/components/dashboard/providers-view"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function ProvidersPage() {
  return (
    <ProtectedRoute>
      <ProvidersView />
    </ProtectedRoute>
  )
}
