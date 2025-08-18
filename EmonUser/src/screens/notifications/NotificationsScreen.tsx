import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Animated as RNAnimated, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { notificationsService, AppNotification } from '../../services/notifications/notificationsService';
import { TimeFormatter } from '../dashboard/utils/TimeFormatter';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AppNotification['type']>('ALL');
  const [sortDir, setSortDir] = useState<'DESC' | 'ASC'>('DESC');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new RNAnimated.Value(0))[0];

  useEffect(() => {
    fetchNotifications();
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchNotifications = async () => {
    setRefreshing(true);
    const uid = getAuth().currentUser?.uid;
    if (!uid) { 
      setLoading(false); 
      setRefreshing(false);
      return; 
    }
    try {
      const unsub = notificationsService.subscribe(uid, (list) => {
        setItems(list);
        setLoading(false);
        setRefreshing(false);
      });
      return () => { try { unsub(); } catch {} };
    } catch (error) {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    let arr = items.filter((n) =>
      (typeFilter === 'ALL' || n.type === typeFilter) &&
      (!text || n.title.toLowerCase().includes(text) || n.body.toLowerCase().includes(text))
    );
    arr = arr.sort((a, b) => {
      const diff = (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0);
      return sortDir === 'DESC' ? -diff : diff;
    });
    return arr;
  }, [items, search, typeFilter, sortDir]);

  const toggleSelect = (id?: string) => {
    if (!id) return;
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSelected = async () => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    try {
      await notificationsService.deleteMany(uid, ids);
      setSelected({});
    } catch (e) {
      console.warn('Delete notifications failed:', e);
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isSelected = !!(item.id && selected[item.id]);
    const isUnread = !item.read;
    const handleOpen = async () => {
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      try {
        if (item.id && isUnread) {
          await notificationsService.markRead(uid, item.id);
        }
      } catch {}

      // Navigate based on notification type
      if (item.type === 'APPLIANCE_LIMIT') {
        const applianceId = (item as any)?.meta?.applianceId;
        const applianceName = item.title;
        try {
          navigation.navigate('Appliances' as never, {
            focusedApplianceId: applianceId,
            scrollToAppliance: true,
            highlightAppliance: true,
            applianceName,
            fromNotification: true,
          } as never);
        } catch (e) {
          try { (navigation as any)?.getParent?.()?.navigate('Appliances'); }
          catch {}
          console.warn('Navigation to Appliances failed:', e);
        }
      } else if (item.type === 'GAUGE_LIMIT') {
        try {
          navigation.navigate('DashboardMain' as never, {
            focus: 'gauge',
            fromNotification: true,
            notificationId: item.id,
          } as never);
        } catch (e) {
          try { (navigation as any)?.getParent?.()?.navigate('Dashboard'); } catch {}
          console.warn('Navigation to DashboardMain failed:', e);
        }
      }
    };
    
    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && styles.cardSelected, isUnread && styles.unreadCard]}
        onLongPress={() => toggleSelect(item.id)}
        onPress={() => {
          if (Object.keys(selected).length > 0) {
            toggleSelect(item.id);
          } else {
            handleOpen();
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          {item.id && (
            <TouchableOpacity 
              style={[styles.checkbox, isSelected && styles.checkboxChecked]} 
              onPress={() => toggleSelect(item.id)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              {isSelected && <Icon name="check" size={16} color="#fff" />}
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.notificationHeader}>
              <Text style={[styles.title, isUnread && styles.unreadTitle]}>{item.title}</Text>
              {isUnread && <View style={styles.unreadBadge} />}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.footer}>
              <Text style={styles.time}>{TimeFormatter.formatShortDateTimeFor(item.createdAt)}</Text>
              <View style={[styles.typePill, item.type === 'GAUGE_LIMIT' ? styles.gaugePill : styles.appliancePill]}>
                <Text style={styles.typePillText}>{item.type === 'GAUGE_LIMIT' ? 'Gauge' : 'Appliance'}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const anySelected = Object.values(selected).some(Boolean);

  return (
    <RNAnimated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Icon name="arrow-back" size={24} color="#467933" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>{items.length} total • {items.filter(i => !i.read).length} unread</Text>
        </View>
        <TouchableOpacity
          onPress={deleteSelected}
          disabled={!anySelected}
          style={[styles.clearBtn, !anySelected && styles.clearBtnDisabled]}
        >
          <Icon name="delete" size={20} color={anySelected ? "#C62828" : "#999"} />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            placeholder="Search notifications..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
        
        <View style={styles.filterRow}>
          <View style={styles.segmented}>
            {['ALL','APPLIANCE_LIMIT','GAUGE_LIMIT'].map((t) => (
              <TouchableOpacity 
                key={t} 
                style={[styles.segment, typeFilter===t && styles.segmentActive]} 
                onPress={() => setTypeFilter(t as any)}
              >
                <Text style={[styles.segmentText, typeFilter===t && styles.segmentTextActive]}>
                  {t==='ALL' ? 'All' : t==='APPLIANCE_LIMIT' ? 'Appliance' : 'Gauge'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.sortBtn} 
            onPress={() => setSortDir(sortDir==='DESC'?'ASC':'DESC')}
          >
            <Icon 
              name={sortDir==='DESC' ? "arrow-downward" : "arrow-upward"} 
              size={16} 
              color="#5B934E" 
              style={styles.sortIcon} 
            />
            <Text style={styles.sortText}>{sortDir==='DESC'?'Newest':'Oldest'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B934E" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => item.id || String(idx)}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="notifications-off" size={48} color="#D3D3D3" />
              <Text style={styles.emptyText}>No notifications found</Text>
              {search || typeFilter !== 'ALL' ? (
                <TouchableOpacity 
                  style={styles.resetFiltersBtn} 
                  onPress={() => {
                    setSearch('');
                    setTypeFilter('ALL');
                  }}
                >
                  <Text style={styles.resetFiltersText}>Reset filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={fetchNotifications}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Selection Action Bar */}
      {anySelected && (
        <Animated.View 
          style={styles.selectionBar}
          entering={FadeInUp}
          exiting={FadeOutDown}
        >
          <Text style={styles.selectionText}>
            {Object.values(selected).filter(Boolean).length} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              onPress={() => setSelected({})} 
              style={styles.selectionActionBtn}
            >
              <Text style={styles.selectionActionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={deleteSelected} 
              style={[styles.selectionActionBtn, styles.deleteActionBtn]}
            >
              <Icon name="delete" size={18} color="#C62828" />
              <Text style={[styles.selectionActionText, styles.deleteActionText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </RNAnimated.View>
  );
};


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA', 
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16,
    marginBottom: 8
  },
  backBtn: { 
    marginRight: 12 
  },
  headerContent: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#2D3748',
    marginBottom: 2 
  },
  headerSub: { 
    fontSize: 13, 
    color: '#718096',
    fontWeight: '500' 
  },
  clearBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5'
  },
  clearBtnDisabled: {
    backgroundColor: '#F1F1F1'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: '#A0AEC0',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500'
  },
  resetFiltersBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E2F0DA',
    borderRadius: 8
  },
  resetFiltersText: {
    color: '#467933',
    fontWeight: '600'
  },
  controls: {
    marginBottom: 12
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 12
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1
  },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    padding: 4
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  segmentText: {
    color: '#4A5568',
    fontWeight: '600',
    fontSize: 14
  },
  segmentTextActive: {
    color: '#2F855A',
    fontWeight: '700'
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  sortIcon: {
    marginRight: 6
  },
  sortText: {
    color: '#2F855A',
    fontWeight: '600',
    fontSize: 14
  },
  listContent: {
    paddingBottom: 20
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#EDF2F7',
  },
  unreadCard: {
    backgroundColor: '#F8FCF7',
    borderLeftWidth: 4,
    borderLeftColor: '#5B934E'
  },
  cardSelected: {
    backgroundColor: '#F0F7ED',
    borderColor: '#5B934E',
    borderWidth: 1
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5B934E',
    marginLeft: 8
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: '#5B934E',
    borderColor: '#5B934E'
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flexShrink: 1
  },
  unreadTitle: {
    fontWeight: '700'
  },
  body: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 8
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  time: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500'
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden'
  },
  gaugePill: {
    backgroundColor: '#EBF8FF'
  },
  appliancePill: {
    backgroundColor: '#FFF5F5'
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600'
  },
  gaugePillText: {
    color: '#3182CE'
  },
  appliancePillText: {
    color: '#E53E3E'
  },
  selectionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  selectionText: {
    color: '#2D3748',
    fontWeight: '700',
    fontSize: 14
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 16
  },
  selectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  deleteActionBtn: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  selectionActionText: {
    color: '#2D3748',
    fontWeight: '600',
    fontSize: 14
  },
  deleteActionText: {
    color: '#C53030',
    marginLeft: 6
  }
});

export default NotificationsScreen;