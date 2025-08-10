import { authService } from '../../../services/auth/authService';

export interface LoginForm {
  email: string;
  password: string;
}

export class LoginManager {
  validate({ email, password }: LoginForm): string | null {
    if (!email || !password) return 'Please fill in all fields';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
    return null;
  }

  validateEmail(email: string): string | null {
    if (!email) return 'Please enter your email address first';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
    return null;
  }

  async signIn(email: string, password: string) {
    return authService.signIn(email, password);
  }

  async resetPassword(email: string) {
    return authService.resetPassword(email);
  }
}

export const loginManager = new LoginManager();
