export interface LandingNavItem {
  label: string
  sectionId: string
}

export interface LandingNav {
  items: LandingNavItem[]
}

export interface LandingHero {
  badge: string
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
}

export interface LandingStat {
  value: string
  label: string
}

export interface LandingService {
  icon: string
  title: string
  description: string
}

export interface LandingAbout {
  label: string
  title: string
  description: string
  stats: LandingStat[]
  services: LandingService[]
}

export interface LandingProject {
  title: string
  description: string
  src: string
  tags: string[]
  category: string
}

export interface LandingShowcase {
  label: string
  title: string
  subtitle: string
  projects: LandingProject[]
}

export interface LandingFaqItem {
  question: string
  answer: string
}

export interface LandingFaqCategory {
  label: string
  items: LandingFaqItem[]
}

export interface LandingFaq {
  label: string
  title: string
  subtitle: string
  categories: LandingFaqCategory[]
}

export interface LandingContactForm {
  name: string
  email: string
  message: string
  submit: string
}

export interface LandingContact {
  label: string
  title: string
  subtitle: string
  email: string
  form: LandingContactForm
}

export interface LandingFooter {
  copyright: string
  tagline: string
  privacy: string
  terms: string
}

export interface LandingContent {
  nav: LandingNav
  hero: LandingHero
  about: LandingAbout
  showcase: LandingShowcase
  faq: LandingFaq
  contact: LandingContact
  footer: LandingFooter
}
