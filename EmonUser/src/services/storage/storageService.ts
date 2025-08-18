import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '../firebase/firebaseConfig';

class StorageService {
  private storage = getStorage(app);

  // Upload profile image to Firebase Storage
  async uploadProfileImage(userId: string, imageUri: string): Promise<string> {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create a reference to the profile image location
      const imageRef = ref(this.storage, `profile-images/${userId}/profile.jpg`);

      // Upload the image
      await uploadBytes(imageRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (err) {
      console.error('Error uploading profile image:', err);
      throw new Error('Failed to upload profile image');
    }
  }

  // Delete profile image from Firebase Storage
  async deleteProfileImage(userId: string): Promise<void> {
    try {
      const imageRef = ref(this.storage, `profile-images/${userId}/profile.jpg`);
      await deleteObject(imageRef);
    } catch (err) {
      console.error('Error deleting profile image:', err);
      // Don't throw error if image doesn't exist
      if (err instanceof Error && !err.message.includes('object-not-found')) {
        throw new Error('Failed to delete profile image');
      }
    }
  }

  // Get profile image URL
  async getProfileImageURL(userId: string): Promise<string | null> {
    try {
      const imageRef = ref(this.storage, `profile-images/${userId}/profile.jpg`);
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (err) {
      console.error('Error getting profile image URL:', err);
      return null;
    }
  }
}

export const storageService = new StorageService();
