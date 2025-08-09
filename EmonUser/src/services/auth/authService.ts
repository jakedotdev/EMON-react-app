import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from '../firebase/firebaseConfig';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: 'user';
  profileImage?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    units: 'kWh' | 'Wh';
  };
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export class AuthService {
  private currentUser: User | null = null;
  private readonly SESSION_KEY = '@emon_user_session';

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      // Temporarily disabled AsyncStorage until build issues are fixed
      // if (user) {
      //   // Save session when user is authenticated
      //   await this.saveSession(user);
      // } else {
      //   // Clear session when user is not authenticated
      //   await this.clearSession();
      // }
    });
  }

  // Save user session to AsyncStorage (temporarily disabled)
  private async saveSession(user: User): Promise<void> {
    try {
      // const sessionData = {
      //   uid: user.uid,
      //   email: user.email,
      //   displayName: user.displayName,
      //   emailVerified: user.emailVerified,
      //   lastLogin: new Date().toISOString()
      // };
      // await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      console.log('Session save disabled - will be re-enabled after build fix');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  // Clear user session from AsyncStorage (temporarily disabled)
  private async clearSession(): Promise<void> {
    try {
      // await AsyncStorage.removeItem(this.SESSION_KEY);
      console.log('Session clear disabled - will be re-enabled after build fix');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  // Get saved session from AsyncStorage (temporarily disabled)
  async getSavedSession(): Promise<any> {
    try {
      // const sessionData = await AsyncStorage.getItem(this.SESSION_KEY);
      // return sessionData ? JSON.parse(sessionData) : null;
      console.log('Session get disabled - will be re-enabled after build fix');
      return null;
    } catch (error) {
      console.error('Error getting saved session:', error);
      return null;
    }
  }

  // Check if user has a valid session (temporarily disabled)
  async hasValidSession(): Promise<boolean> {
    // const session = await this.getSavedSession();
    // return session !== null && session.uid;
    return false; // Temporarily return false until AsyncStorage is fixed
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Sign up with email and password
  async signUp(email: string, password: string, displayName: string): Promise<UserProfile> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        role: 'user',
        preferences: {
          theme: 'light',
          notifications: true,
          units: 'kWh'
        },
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
        emailVerified: user.emailVerified
      };

      await setDoc(doc(firestore, 'users', user.uid), userProfile);

      return userProfile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userProfile = userDoc.data() as UserProfile;

      // Update last login
      await updateDoc(doc(firestore, 'users', user.uid), {
        lastLogin: new Date()
      });

      return userProfile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      // await this.clearSession(); // Temporarily disabled
    } catch (error: any) {
      throw new Error('Failed to sign out');
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', uid));
      
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'users', uid), updates);
    } catch (error) {
      throw new Error('Failed to update user profile');
    }
  }

  // Update user preferences
  async updateUserPreferences(uid: string, preferences: Partial<UserProfile['preferences']>): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'users', uid), {
        preferences: { ...preferences }
      });
    } catch (error) {
      throw new Error('Failed to update user preferences');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get error message from Firebase error code
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      default:
        return 'An error occurred. Please try again';
    }
  }
}

export const authService = new AuthService();
