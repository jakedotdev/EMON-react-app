import { authService } from '../../../services/auth/authService';

export interface SignUpForm {
  displayName: string;
  email: string;
  password: string;
  preferredTimezone: string;
}

export class SignUpManager {
  getDefaultTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  validate(form: SignUpForm): string | null {
    const { displayName, email, password, preferredTimezone } = form;
    if (!displayName || !email || !password || !preferredTimezone) {
      return 'Please fill in all fields';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email';
    }
    // Professional password policy: min 8, upper, lower, number, symbol, no spaces
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const hasNoSpaces = !/\s/.test(password);
    if (!hasMinLen || !hasUpper || !hasLower || !hasNumber || !hasSymbol || !hasNoSpaces) {
      return 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol, with no spaces.';
    }
    // Validate timezone
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: preferredTimezone }).format(new Date());
    } catch {
      return 'Please select a valid IANA timezone (e.g., Asia/Manila)';
    }
    return null;
  }

  getPasswordGuidelines(): string {
    return 'Use at least 8 characters including uppercase, lowercase, a number, and a symbol. No spaces.';
  }

  assessPasswordStrength(password: string): {
    score: 0 | 1 | 2 | 3 | 4;
    label: 'Very weak' | 'Weak' | 'Medium' | 'Strong' | 'Very strong';
    checks: {
      hasMinLen: boolean;
      hasUpper: boolean;
      hasLower: boolean;
      hasNumber: boolean;
      hasSymbol: boolean;
      hasNoSpaces: boolean;
    };
  } {
    const checks = {
      hasMinLen: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSymbol: /[^A-Za-z0-9]/.test(password),
      hasNoSpaces: !/\s/.test(password),
    };
    const satisfied = Object.values(checks).filter(Boolean).length;
    // Basic scoring: count satisfied checks (6 total), map to 0-4 scale
    let score: 0 | 1 | 2 | 3 | 4 = 0;
    if (satisfied <= 1) score = 0;
    else if (satisfied === 2) score = 1;
    else if (satisfied === 3 || satisfied === 4) score = 2;
    else if (satisfied === 5) score = 3;
    else score = 4; // all 6 satisfied

    const labelMap: Record<typeof score, 'Very weak' | 'Weak' | 'Medium' | 'Strong' | 'Very strong'> = {
      0: 'Very weak',
      1: 'Weak',
      2: 'Medium',
      3: 'Strong',
      4: 'Very strong',
    };

    return { score, label: labelMap[score], checks };
  }

  async signUp(form: SignUpForm): Promise<void> {
    const { email, password, displayName, preferredTimezone } = form;
    await authService.signUp(email, password, displayName, preferredTimezone);
  }
}

export const signUpManager = new SignUpManager();
