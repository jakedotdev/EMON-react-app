/**
 * EMON User App
 * Firebase Realtime Database Test
 */

import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { backgroundService } from './src/services/BackgroundService';

function App() {
  useEffect(() => {
    backgroundService.initialize();
    return () => backgroundService.stop();
  }, []);

  return <AppNavigator />;
}

export default App;
