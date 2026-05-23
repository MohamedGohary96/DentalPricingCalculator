import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

// Lazy-loaded views
const WelcomeView           = () => import('@/views/public/WelcomeView.vue')
const LoginView             = () => import('@/views/auth/LoginView.vue')
const RegisterView          = () => import('@/views/auth/RegisterView.vue')
const VerifyEmailView       = () => import('@/views/auth/VerifyEmailView.vue')
const ForgotPasswordView    = () => import('@/views/auth/ForgotPasswordView.vue')
const ResetPasswordView     = () => import('@/views/auth/ResetPasswordView.vue')
const SetupIntroView        = () => import('@/views/setup/SetupIntroView.vue')
const Step1ProfileView      = () => import('@/views/setup/Step1ProfileView.vue')
const Step2CostsView        = () => import('@/views/setup/Step2CostsView.vue')
const Step3HoursView        = () => import('@/views/setup/Step3HoursView.vue')
const ChairCostView         = () => import('@/views/results/ChairCostView.vue')
const PriceListView         = () => import('@/views/results/PriceListView.vue')
const DashboardView         = () => import('@/views/app/DashboardView.vue')
const ServicesView          = () => import('@/views/app/ServicesView.vue')
const ConsumablesView       = () => import('@/views/app/ConsumablesView.vue')
const SettingsView          = () => import('@/views/app/SettingsView.vue')
const CaseTrackerView       = () => import('@/views/app/CaseTrackerView.vue')
const SubscriptionView      = () => import('@/views/app/SubscriptionView.vue')
const SuperAdminView        = () => import('@/views/app/SuperAdminView.vue')

const routes = [
  { path: '/', redirect: '/welcome' },
  { path: '/welcome',           component: WelcomeView },
  { path: '/login',             component: LoginView },
  { path: '/register',          component: RegisterView },
  { path: '/verify-email',      component: VerifyEmailView },
  { path: '/forgot-password',   component: ForgotPasswordView },
  { path: '/reset-password',    component: ResetPasswordView },
  { path: '/setup',             component: SetupIntroView,     meta: { requiresAuth: true } },
  { path: '/setup/1',           component: Step1ProfileView,   meta: { requiresAuth: true } },
  { path: '/setup/2',           component: Step2CostsView,     meta: { requiresAuth: true } },
  { path: '/setup/3',           component: Step3HoursView,     meta: { requiresAuth: true } },
  { path: '/results/chair-cost',component: ChairCostView,      meta: { requiresAuth: true } },
  { path: '/results/price-list',component: PriceListView,      meta: { requiresAuth: true } },
  { path: '/app/dashboard',     component: DashboardView,      meta: { requiresAuth: true } },
  { path: '/app/services',      component: ServicesView,       meta: { requiresAuth: true } },
  { path: '/app/consumables',   component: ConsumablesView,    meta: { requiresAuth: true } },
  { path: '/app/settings',      component: SettingsView,       meta: { requiresAuth: true } },
  { path: '/app/cases',         component: CaseTrackerView,    meta: { requiresAuth: true } },
  { path: '/app/subscription',  component: SubscriptionView,   meta: { requiresAuth: true } },
  { path: '/app/super-admin',   component: SuperAdminView,     meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*',   redirect: '/welcome' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const auth = useAuthStore()

  // Wait for any pending auth fetch to complete
  if (auth.loading) {
    await new Promise(resolve => {
      const check = () => {
        if (!auth.loading) {
          resolve()
        } else {
          setTimeout(check, 50)
        }
      }
      check()
    })
  }

  // If still not logged in after loading completes, fetch user
  if (!auth.isLoggedIn) {
    try {
      await auth.fetchUser()
    } catch {
      return '/login'
    }
    if (!auth.isLoggedIn) return '/login'
  }

  // Redirect to onboarding wizard if not yet completed
  // Check both the user object and ensure the value is explicitly 0
  const oc = auth.user?.onboarding_completed
  if (
    (oc === 0 || oc === false) &&
    !to.path.startsWith('/setup') &&
    !to.path.startsWith('/verify-email')
  ) {
    return '/setup'
  }

  return true
})

export default router
