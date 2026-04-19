import { passwordComplexitySchema } from '#shared/schemas/userSchema'

export interface PasswordStrength {
  score: number // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  feedback: string
  checks: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
  color: string
}

/**
* Calculate password strength based on various criteria
*/
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      level: 'weak',
      feedback: 'Enter a password',
      checks: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
      color: 'hsl(var(--destructive))',
    }
  }

  // Validate password against schema
  const result = passwordComplexitySchema.safeParse(password)

  let checks: PasswordStrength['checks']

  if (result.success) {
    // All checks passed
    checks = {
      length: true,
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
    }
  }
  else {
    // Parse validation errors to determine which checks failed
    const errorMessages = result.error.issues.map(issue => issue.message)
    checks = {
      length: !errorMessages.some(msg => msg.includes('at least 8 characters')),
      uppercase: !errorMessages.some(msg => msg.includes('uppercase letter')),
      lowercase: !errorMessages.some(msg => msg.includes('lowercase letter')),
      number: !errorMessages.some(msg => msg.includes('number')),
      special: !errorMessages.some(msg => msg.includes('special character')),
    }
  }

  // Calculate score (20 points per check)
  let score = 0
  if (checks.length) score += 20
  if (checks.uppercase) score += 20
  if (checks.lowercase) score += 20
  if (checks.number) score += 20
  if (checks.special) score += 20

  // Bonus points for extra length
  if (password.length >= 12) score += 5
  if (password.length >= 16) score += 5

  // Cap at 100
  score = Math.min(score, 100)

  // Determine level and feedback
  let level: PasswordStrength['level']
  let feedback: string
  let color: string

  if (score < 40) {
    level = 'weak'
    feedback = 'Weak password - add more variety'
    color = 'hsl(var(--destructive))'
  }
  else if (score < 60) {
    level = 'fair'
    feedback = 'Fair password - could be stronger'
    color = 'hsl(25, 95%, 53%)'
  }
  else if (score < 80) {
    level = 'good'
    feedback = 'Good password'
    color = 'hsl(45, 93%, 47%)'
  }
  else if (score < 100) {
    level = 'strong'
    feedback = 'Strong password'
    color = 'hsl(142, 76%, 36%)'
  }
  else {
    level = 'very-strong'
    feedback = 'Very strong password!'
    color = 'hsl(142, 76%, 36%)'
  }

  return {
    score,
    level,
    feedback,
    checks,
    color,
  }
}
