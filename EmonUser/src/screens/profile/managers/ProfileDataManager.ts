import { getAuth, updateProfile as fbUpdateProfile, User } from 'firebase/auth';
import { userService, UserProfile } from '../../../services/user/userService';
import { storageService } from '../../../services/storage/storageService';
import { authService } from '../../../services/auth/authService';

/**
 * ProfileDataManager encapsulates all business logic for the Profile screen.
 * It handles loading/saving profile data, image upload/removal, and sign out.
 */
export class ProfileDataManager {
  private get currentUser(): User | null {
    return getAuth().currentUser;
  }

  /**
   * Upload profile image to storage and return the download URL without
   * persisting it to Firestore. Useful while user is in edit mode.
   */
  async uploadProfileImageDryRun(localUri: string): Promise<string> {
    const cu = this.currentUser;
    if (!cu) throw new Error('No authenticated user');

    const downloadURL = await storageService.uploadProfileImage(cu.uid, localUri);
    return downloadURL;
  }

  async loadProfile(): Promise<UserProfile> {
    const cu = this.currentUser;
    if (!cu) throw new Error('No authenticated user');

    let profile = await userService.getUserProfile(cu.uid);
    if (!profile) {
      profile = {
        id: cu.uid,
        fullName: cu.displayName || 'User',
        displayName: cu.displayName || 'User',
        email: cu.email || '',
        phone: '',
        address: '',
        profileImage: '',
        preferredTimezone: 'Asia/Manila',
        preferences: {
          notifications: true,
          energyAlerts: true,
          darkMode: false,
          language: 'English',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userService.createUserProfile(cu.uid, profile);
    }
    return profile;
  }

  async saveProfile(updated: UserProfile): Promise<void> {
    const cu = this.currentUser;
    if (!cu) throw new Error('No authenticated user');

    // Keep Firebase Auth's displayName in sync with the user's chosen displayName.
    // If displayName is empty, fall back to fullName.
    const nextDisplayName = (updated as any).displayName || updated.fullName || '';
    if (nextDisplayName !== (cu.displayName || '')) {
      await fbUpdateProfile(cu, { displayName: nextDisplayName });
    }

    await userService.updateUserProfile(cu.uid, updated);
  }

  async uploadProfileImage(localUri: string, baseProfile: UserProfile): Promise<UserProfile> {
    const cu = this.currentUser;
    if (!cu) throw new Error('No authenticated user');

    const downloadURL = await storageService.uploadProfileImage(cu.uid, localUri);
    const updated = { ...baseProfile, profileImage: downloadURL };
    await userService.updateUserProfile(cu.uid, updated);
    return updated;
  }

  async removeProfileImage(baseProfile: UserProfile): Promise<UserProfile> {
    const cu = this.currentUser;
    if (!cu) throw new Error('No authenticated user');

    await storageService.deleteProfileImage(cu.uid);
    const updated = { ...baseProfile, profileImage: '' };
    await userService.updateUserProfile(cu.uid, updated);
    return updated;
  }

  async signOut(): Promise<void> {
    await authService.signOut();
  }
}

export const profileDataManager = new ProfileDataManager();
