import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { TimeFormatter } from '../utils/TimeFormatter';

interface DashboardHeaderProps {
  currentUser: any;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ currentUser }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(TimeFormatter.formatTime());
      setCurrentDate(TimeFormatter.formatDate());
    };

    // Initial update
    updateTime();

    // Set up interval
    const cleanup = TimeFormatter.createTimeUpdateInterval(updateTime);

    // Subscribe to timezone changes for immediate UI refresh
    const unsubscribeTz = TimeFormatter.subscribe(updateTime);

    return () => {
      cleanup();
      unsubscribeTz();
    };
  }, []);

  const greeting = TimeFormatter.getGreeting();
  const timeOfDay = TimeFormatter.getTimeOfDay();

  // Get greeting icon based on time of day
  const getGreetingIcon = () => {
    switch (timeOfDay) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌆';
      case 'night': return '🌙';
      default: return '👋';
    }
  };

  return (
    <View style={styles.header}>
      {/* Header Background Pattern */}
      <View style={styles.backgroundPattern} />
      
      {/* Main Header Content */}
      <View style={styles.headerContent}>
        {/* Top Row - User Info and Notifications */}
        <View style={styles.topRow}>
          <View style={styles.userSection}>
            <TouchableOpacity style={styles.avatarContainer}>
              {currentUser?.photoURL ? (
                <Image
                  source={{ uri: currentUser.photoURL }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </TouchableOpacity>
            
            <View style={styles.userInfo}>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>
                  {greeting}!
                </Text>
                <Text style={styles.greetingIcon}>{getGreetingIcon()}</Text>
              </View>
              <Text style={styles.userName}>
                {currentUser?.displayName || 'Welcome User'}
              </Text>
              <Text style={styles.subtitle}>Monitor your energy consumption</Text>
            </View>
          </View>
          
          {/* Notification Bell */}
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Bottom Row - Date and Time */}
        <View style={styles.timeSection}>
          <View style={styles.timeCard}>
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Today</Text>
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
            
            <View style={styles.timeDivider} />
            
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>Current Time</Text>
              <Text style={styles.timeText}>{currentTime}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#5B934E',
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5B934E',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetingIcon: {
    paddingLeft: 8,
    fontSize: 18,
    marginRight: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timeSection: {
    alignItems: 'center',
  },
  timeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  timeDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  timeContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default DashboardHeader;
