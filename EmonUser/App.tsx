/**
 * EMON User App
 * Firebase Realtime Database Test
 */

import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { backgroundService } from './src/services/BackgroundService';
import RNBootSplash from 'react-native-bootsplash';

function App() {
  useEffect(() => {
    backgroundService.initialize();
    // Hide native splash once the JS bridge is ready
    RNBootSplash.hide({ fade: true }).catch(() => {
      // no-op: hide may throw if already hidden
    });
    return () => backgroundService.stop();
  }, []);

  return <AppNavigator />;
}

export default App;
