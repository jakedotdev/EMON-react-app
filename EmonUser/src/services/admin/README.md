# Admin Service

This service handles admin operations for device management and user administration.

## Features

- **activateDeviceForUser(serialNumber, userId, deviceName)**: Activates a device for a specific user
- **getAllDevices()**: Retrieves all devices from Firestore
- **getDevicesByUser(userId)**: Gets devices assigned to a specific user
- **deactivateDevice(deviceId)**: Deactivates a device
- **transferDevice(deviceId, newUserId)**: Transfers device ownership to another user
- **updateDeviceUserId(deviceId, newUserId)**: Updates device ownership
- **updateAllDevicesToCurrentUser(userId)**: Updates all existing devices to a specific user
- **activateDevelopmentDevices(userId)**: Activates development devices for testing

## Development Helpers

### activateDevelopmentDevices(userId)

This function is specifically designed for development and testing. It activates the three known devices from your Realtime Database:

- **Device 1**: Serial Number `11032401`
- **Device 2**: Serial Number `11032402` 
- **Device 3**: Serial Number `11032403`

### Usage

```typescript
import { adminService } from '../services/admin/adminService';

// Activate development devices for current user
await adminService.activateDevelopmentDevices(currentUser.uid);

// Activate a specific device
await adminService.activateDeviceForUser('11032401', userId, 'Device 1');

// Update all existing devices to current user
await adminService.updateAllDevicesToCurrentUser(currentUser.uid);
```

## Data Structure

Devices are stored in the `devices` collection with the following structure:

```typescript
interface Device {
  id: string;                    // Firestore document ID
  serialNumber: string;          // Device serial number (from Realtime DB)
  name: string;                  // Device display name
  userId: string;                // Owner user ID
  isActivated: boolean;          // Device activation status
  isConnected: boolean;          // Real-time connection status
  applianceState: boolean;       // Appliance on/off state
  createdAt: Date;               // Device creation timestamp
  activatedAt?: Date;            // Device activation timestamp
}
```

## Development Workflow

1. **Activate Devices**: Use `activateDevelopmentDevices()` to activate test devices
2. **Register Appliances**: Users can now register appliances using the activated devices
3. **Monitor Status**: Check device connection status in real-time
4. **Test Features**: Test all appliance management features with real device data
