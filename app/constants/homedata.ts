import { Bell, Shield, Wifi, Zap } from '@lucide/vue'

export const INSTALL_PROMPTER_FEATURES = [
  {
    icon: Zap,
    title: 'Instant Access',
    description: 'Launch directly from your home screen without opening a browser',
    colorClass: 'blue',
  },
  {
    icon: Wifi,
    title: 'Offline Ready',
    description: 'Continue learning even without internet connection',
    colorClass: 'green',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Get immediate notifications about new features and updates',
    colorClass: 'purple',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data stays safe with enhanced security features',
    colorClass: 'orange',
  },
] as const
