import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { authService } from '../../services/auth/authService';
import { adminService } from '../../services/admin/adminService';
import { userService, UserProfile as UserProfileType } from '../../services/user/userService';
import { deviceService } from '../../services/devices/deviceService';
import { storageService } from '../../services/storage/storageService';
import { getAuth, updateProfile } from 'firebase/auth';

type UserProfile = UserProfileType;

const ProfileScreen: React.FC = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  const [profile, setProfile] = useState<UserProfile>({
    id: currentUser?.uid || '',
    fullName: currentUser?.displayName || 'User',
    email: currentUser?.email || '',
    phone: '',
    address: '',
    profileImage: '',
    preferences: {
      notifications: true,
      energyAlerts: true,
      darkMode: false,
      language: 'English',
    },
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [userDevices, setUserDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
      loadUserDevices();
    }
  }, [currentUser]);

  const loadUserProfile = async () => {
    if (!currentUser) return;
    
    try {
      // Try to get existing profile from Firestore
      let userProfile = await userService.getUserProfile(currentUser.uid);
      
      if (!userProfile) {
        // Create new profile with Firebase Auth data
        userProfile = {
          id: currentUser.uid,
          fullName: currentUser.displayName || 'User',
          email: currentUser.email || '',
          phone: '',
          address: '',
          profileImage: '',
          preferences: {
            notifications: true,
            energyAlerts: true,
            darkMode: false,
            language: 'English',
          },
        };
        
        // Save to Firestore
        await userService.createUserProfile(currentUser.uid, userProfile);
      }
      
      setProfile(userProfile);
      setEditedProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const loadUserDevices = async () => {
    if (!currentUser) return;
    
    setLoadingDevices(true);
    try {
      const devices = await deviceService.getUserDevices(currentUser.uid);
      setUserDevices(devices);
    } catch (error) {
      console.error('Error loading user devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    try {
      // Update Firebase Auth display name if it changed
      if (editedProfile.fullName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: editedProfile.fullName
        });
      }
      
      // Save profile data to Firestore
      await userService.updateUserProfile(currentUser.uid, editedProfile);
      
      setProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const showImagePicker = () => {
    const options = [
      'Take Photo',
      'Choose from Library',
      'Remove Photo',
      'Cancel'
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
          destructiveButtonIndex: 2,
        },
        (buttonIndex) => {
          handleImagePickerResponse(buttonIndex);
        }
      );
    } else {
      // For Android, we'll use Alert
      Alert.alert(
        'Profile Photo',
        'Choose an option',
        [
          { text: 'Take Photo', onPress: () => handleImagePickerResponse(0) },
          { text: 'Choose from Library', onPress: () => handleImagePickerResponse(1) },
          { text: 'Remove Photo', onPress: () => handleImagePickerResponse(2), style: 'destructive' },
          { text: 'Cancel', onPress: () => handleImagePickerResponse(3), style: 'cancel' },
        ]
      );
    }
  };

  const handleImagePickerResponse = (buttonIndex: number) => {
    switch (buttonIndex) {
      case 0: // Take Photo
        launchCamera(
          {
            mediaType: 'photo' as MediaType,
            quality: 0.8,
            maxWidth: 800,
            maxHeight: 800,
          },
          handleImageResponse
        );
        break;
      case 1: // Choose from Library
        launchImageLibrary(
          {
            mediaType: 'photo' as MediaType,
            quality: 0.8,
            maxWidth: 800,
            maxHeight: 800,
          },
          handleImageResponse
        );
        break;
      case 2: // Remove Photo
        handleRemovePhoto();
        break;
      case 3: // Cancel
        console.log('Photo selection cancelled');
        break;
      default:
        // Handle any other cases (like when user dismisses without selecting)
        console.log('Photo selection dismissed');
        break;
    }
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      if (asset.uri) {
        uploadProfileImage(asset.uri);
      }
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    if (!currentUser) return;

    setUploadingImage(true);
    try {
      // Upload image to Firebase Storage
      const downloadURL = await storageService.uploadProfileImage(currentUser.uid, imageUri);

      // Update profile with new image URL
      const updatedProfile = { ...editedProfile, profileImage: downloadURL };
      setEditedProfile(updatedProfile);

      // If not in editing mode, save immediately
      if (!isEditing) {
        await userService.updateUserProfile(currentUser.uid, updatedProfile);
        setProfile(updatedProfile);
        Alert.alert('Success', 'Profile photo updated successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile photo');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentUser) return;

    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingImage(true);
            try {
              // Delete image from Firebase Storage
              await storageService.deleteProfileImage(currentUser.uid);

              // Update profile to remove image URL
              const updatedProfile = { ...editedProfile, profileImage: '' };
              setEditedProfile(updatedProfile);

              // If not in editing mode, save immediately
              if (!isEditing) {
                await userService.updateUserProfile(currentUser.uid, updatedProfile);
                setProfile(updatedProfile);
                Alert.alert('Success', 'Profile photo removed successfully');
              }
            } catch (error) {
              console.error('Error removing image:', error);
              Alert.alert('Error', 'Failed to remove profile photo');
            } finally {
              setUploadingImage(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const renderProfileField = (
    label: string,
    value: string,
    key: keyof UserProfile,
    isEditable: boolean = true
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing && isEditable ? (
        <TextInput
          style={styles.input}
          value={editedProfile[key] as string}
          onChangeText={(text) =>
            setEditedProfile({ ...editedProfile, [key]: text })
          }
          placeholder={label}
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  );

  const renderPreferenceToggle = (
    label: string,
    value: boolean,
    key: keyof UserProfile['preferences']
  ) => (
    <View style={styles.preferenceItem}>
      <Text style={styles.preferenceLabel}>{label}</Text>
                        <Switch
                    value={isEditing ? (editedProfile.preferences[key] as boolean) : value}
                    onValueChange={(newValue) => {
                      if (isEditing) {
                        setEditedProfile({
                          ...editedProfile,
                          preferences: {
                            ...editedProfile.preferences,
                            [key]: newValue,
                          },
                        });
                      }
                    }}
                    trackColor={{ false: '#D3E6BF', true: '#5B934E' }}
                    thumbColor={value ? '#FFFFFF' : '#467933'}
                    disabled={!isEditing}
                  />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        <TouchableOpacity
          style={styles.profilePictureContainer}
          onPress={showImagePicker}
          disabled={uploadingImage}
        >
          {(editedProfile.profileImage || profile.profileImage) ? (
            <Image
              source={{ uri: editedProfile.profileImage || profile.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePicture}>
              <Text style={styles.profileInitials}>
                {(editedProfile.fullName || profile.fullName).split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          <View style={styles.editImageOverlay}>
            {uploadingImage ? (
              <Text style={styles.editImageText}>Uploading...</Text>
            ) : (
              <Text style={styles.cameraIcon}>📷</Text>
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{profile.fullName}</Text>
        <Text style={styles.profileEmail}>{profile.email}</Text>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editProfileButtonText}>
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        {renderProfileField('Full Name', profile.fullName, 'fullName')}
        {renderProfileField('Email', profile.email, 'email', false)}
        {renderProfileField('Phone', profile.phone, 'phone')}
        {renderProfileField('Address', profile.address, 'address')}
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {renderPreferenceToggle('Push Notifications', profile.preferences.notifications, 'notifications')}
        {renderPreferenceToggle('Energy Alerts', profile.preferences.energyAlerts, 'energyAlerts')}
        {renderPreferenceToggle('Dark Mode', profile.preferences.darkMode, 'darkMode')}
      </View>

                        {/* Account Actions */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Change Password</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Privacy Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Data Export</Text>
                    </TouchableOpacity>

                    
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                      onPress={async () => {
                        try {
                          if (currentUser) {
                            await adminService.updateAllDevicesToCurrentUser(currentUser.uid);
                            Alert.alert('Success', 'All existing devices updated to current user!');
                          }
                        } catch (error) {
                          Alert.alert('Error', 'Failed to update devices');
                        }
                      }}
                    >
                      <Text style={styles.actionButtonText}>Update Existing Devices to Current User</Text>
                    </TouchableOpacity>

                    {/* Development Helper - Activate Devices */}
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                      onPress={async () => {
                        try {
                          if (currentUser) {
                            await adminService.activateDevelopmentDevices(currentUser.uid);
                            Alert.alert('Success', 'Development devices activated! You can now register appliances.');
                            loadUserDevices(); // Reload devices after activation
                          }
                        } catch (error) {
                          Alert.alert('Error', 'Failed to activate development devices');
                        }
                      }}
                    >
                      <Text style={styles.actionButtonText}>Activate Development Devices</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Development - User's Activated Devices */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Activated Devices</Text>
                    {loadingDevices ? (
                      <Text style={styles.loadingText}>Loading devices...</Text>
                    ) : userDevices.length > 0 ? (
                      userDevices.map((device, index) => (
                        <View key={device.id} style={styles.deviceItem}>
                          <Text style={styles.deviceName}>{device.name}</Text>
                          <Text style={styles.deviceSerial}>Serial: {device.serialNumber}</Text>
                          <Text style={styles.deviceStatus}>
                            Status: {device.isConnected ? 'Connected' : 'Disconnected'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDevicesText}>
                        No devices activated. Use "Activate Development Devices" to activate devices for testing.
                      </Text>
                    )}
                  </View>

      {/* Save/Cancel Buttons */}
      {isEditing && (
        <View style={styles.editButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelEdit}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5B934E',
  },
  editButton: {
    backgroundColor: '#5B934E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },


  profilePictureSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5B934E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(91, 147, 78, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editImageText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cameraIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  editProfileButton: {
    backgroundColor: '#5B934E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B934E',
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3E6BF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#5B934E',
  },
  editButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#5B934E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#F44336',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  signOutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  deviceItem: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#5B934E',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  deviceSerial: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  deviceStatus: {
    fontSize: 14,
    color: '#5B934E',
    fontWeight: '500',
  },
  noDevicesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ProfileScreen;
