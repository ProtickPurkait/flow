import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from '@/hooks/useAuth'
import { ToastProvider } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AdminRoute } from '@/components/layout/AdminRoute'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { CustomerShell } from '@/components/layout/CustomerShell'

import HomePage from '@/pages/customer/HomePage'

const LoginPage = lazy(() => import('@/pages/dashboard/LoginPage'))
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome'))
const CustomersPage = lazy(() => import('@/pages/dashboard/CustomersPage'))
const WinnersPage = lazy(() => import('@/pages/dashboard/WinnersPage'))
const OffersHubPage = lazy(() => import('@/pages/dashboard/offers/OffersHubPage'))
const StampCardPage = lazy(() => import('@/pages/dashboard/offers/StampCardPage'))
const ScratchCardPage = lazy(() => import('@/pages/dashboard/offers/ScratchCardPage'))
const MenuPage = lazy(() => import('@/pages/dashboard/offers/MenuPage'))
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))
const EntryPage = lazy(() => import('@/pages/customer/EntryPage'))
const BusinessPage = lazy(() => import('@/pages/customer/BusinessPage'))
const MenuViewPage = lazy(() => import('@/pages/customer/MenuViewPage'))
const ExplorePage = lazy(() => import('@/pages/customer/ExplorePage'))
const RewardsPage = lazy(() => import('@/pages/customer/RewardsPage'))
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'))
const PrivacySecurityPage = lazy(() => import('@/pages/customer/PrivacySecurityPage'))
const HelpSupportPage = lazy(() => import('@/pages/customer/HelpSupportPage'))
const TermsPage = lazy(() => import('@/pages/legal/TermsPage'))
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardShell />}>
                <Route path="/dashboard" element={<DashboardHome />} />
                <Route path="/dashboard/customers" element={<CustomersPage />} />
                <Route path="/dashboard/winners" element={<WinnersPage />} />
                <Route path="/dashboard/offers" element={<OffersHubPage />} />
                <Route path="/dashboard/offers/stamp-card" element={<StampCardPage />} />
                <Route path="/dashboard/offers/scratch-cards" element={<ScratchCardPage />} />
                <Route path="/dashboard/offers/digital-menu" element={<MenuPage />} />
                <Route path="/dashboard/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* Customer app -- root domain, matches druto.in's own IA */}
            <Route path="/" element={<HomePage />} />
            <Route element={<CustomerShell />}>
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/rewards" element={<RewardsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="/business/:slug" element={<BusinessPage />} />
            <Route path="/menu/:slug" element={<MenuViewPage />} />

            {/* QR deep link into one business -- printed on physical QR codes */}
            <Route path="/b/:slug" element={<EntryPage />} />

            <Route path="/profile/privacy-security" element={<PrivacySecurityPage />} />
            <Route path="/profile/help-support" element={<HelpSupportPage />} />

            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  )
}
