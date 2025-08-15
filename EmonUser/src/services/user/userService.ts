import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  profileImage?: string;
  preferredTimezone?: string;
  preferences: {
    notifications: boolean;
    energyAlerts: boolean;
    darkMode: boolean;
    language: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

class UserService {
  private db = getFirestore();

  // Get user profile from Firestore
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
                 return {
           id: userSnap.id,
           fullName: data.fullName || '',
           email: data.email || '',
           phone: data.phone || '',
           address: data.address || '',
           profileImage: data.profileImage || '',
           preferredTimezone: data.preferredTimezone || 'Asia/Manila',
           preferences: {
             notifications: data.preferences?.notifications ?? true,
             energyAlerts: data.preferences?.energyAlerts ?? true,
             darkMode: data.preferences?.darkMode ?? false,
             language: data.preferences?.language ?? 'English',
           },
           createdAt: data.createdAt?.toDate(),
           updatedAt: data.updatedAt?.toDate(),
         };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Create or update user profile in Firestore
  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        ...profile,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Create new user profile in Firestore
  async createUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await setDoc(userRef, {
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
