# User Service

This service handles user profile operations in Firestore.

## Features

- **getUserProfile(userId)**: Retrieves user profile from Firestore
- **updateUserProfile(userId, profile)**: Updates user profile in Firestore
- **createUserProfile(userId, profile)**: Creates new user profile in Firestore

## Data Structure

User profiles are stored in the `users` collection with the following structure:

```typescript
interface UserProfile {
  id: string;                    // User UID from Firebase Auth
  fullName: string;              // User's full name
  email: string;                 // User's email address
  phone: string;                 // User's phone number
  address: string;               // User's address
  profileImage?: string;         // User's profile image URL
  preferences: {
    notifications: boolean;      // Push notifications preference
    energyAlerts: boolean;       // Energy alerts preference
    darkMode: boolean;           // Dark mode preference
    language: string;            // Language preference
  };
  createdAt?: Date;              // Profile creation timestamp
  updatedAt?: Date;              // Last update timestamp
}
```

## Usage

```typescript
import { userService } from '../services/user/userService';

// Get user profile
const profile = await userService.getUserProfile(userId);

// Update user profile
await userService.updateUserProfile(userId, {
  fullName: 'John Doe',
  phone: '+1234567890'
});

// Create new user profile
await userService.createUserProfile(userId, userProfile);
```
