import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, RefreshControl, ActivityIndicator, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native';
import BugReportModal from './components/BugReportModal';
import { settingsStyles } from '../../settings/styles';
import { auth, firestore } from '../../../services/firebase/firebaseConfig';
import { collection, getDocs, orderBy, query, where, doc, deleteDoc } from 'firebase/firestore';

const MyReportsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Array<{ id: string; type?: string; status?: string; description?: string; createdAt?: any; response?: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(''); // YYYY-MM-DD
  const [toDate, setToDate] = useState('');     // YYYY-MM-DD
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortAsc, setSortAsc] = useState(false); // default: newest first
  const STATUS_OPTIONS = ['to be reviewed', 'reviewed', 'validated', 'rejected'] as const;
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bugModalVisible, setBugModalVisible] = useState(false);

  const parseDate = (s: string, endOfDay = false) => {
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(s.trim());
    if (!m) return null;
    const d = new Date(s + (endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'));
    return isNaN(d.getTime()) ? null : d;
  };

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Delete reports',
      `Are you sure you want to delete ${selectedIds.size} selected report(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              setLoading(true);
              const uid = auth.currentUser?.uid;
              if (!uid) throw new Error('No user');
              const ops = Array.from(selectedIds).map((id) => deleteDoc(doc(firestore, 'BugReports', uid, 'reports', id)));
              await Promise.all(ops);
              setSelectedIds(new Set());
              setSelectMode(false);
              await load();
              Alert.alert('Deleted', 'Selected reports have been deleted.');
            } catch (e) {
              console.error('Delete reports error', e);
              Alert.alert('Delete failed', 'Could not delete selected reports. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const user = auth.currentUser;
      const uid = user?.uid;
      if (!uid) {
        Alert.alert('Sign in required', 'Please sign in to view your reports.');
        setItems([]);
        return;
      }
      const base = collection(firestore, 'BugReports', uid, 'reports');
      const from = parseDate(fromDate);
      const to = parseDate(toDate, true);
      let qRef: any = query(base, orderBy('createdAt', sortAsc ? 'asc' : 'desc'));
      // For range queries Firestore requires orderBy on same field
      if (from) {
        qRef = query(base, where('createdAt', '>=', from), orderBy('createdAt', sortAsc ? 'asc' : 'desc'));
      }
      if (to) {
        qRef = from
          ? query(base, where('createdAt', '>=', from), where('createdAt', '<=', to), orderBy('createdAt', sortAsc ? 'asc' : 'desc'))
          : query(base, where('createdAt', '<=', to), orderBy('createdAt', sortAsc ? 'asc' : 'desc'));
      }
      const snap = await getDocs(qRef);
      setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e) {
      console.error('Load reports error', e);
      setError('Failed to load reports. Pull to refresh to retry.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, sortAsc]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = items.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.type || '').toLowerCase().includes(s) ||
      (r.status || '').toLowerCase().includes(s) ||
      (r.description || '').toLowerCase().includes(s) ||
      (r.response || '').toLowerCase().includes(s)
    );
  });

  // Apply status chip filters client-side to avoid requiring Firestore composite indexes
  const filteredByStatus = selectedStatuses.length
    ? filtered.filter((r) => selectedStatuses.includes(normalizeStatus(r.status)))
    : filtered;

  const emptyMessage = selectedStatuses.length === 1
    ? `There is no ${getStatusLabel(selectedStatuses[0])} report yet.`
    : selectedStatuses.length > 1
    ? 'There are no reports for the selected status filters yet.'
    : 'You have no reports yet.';

  const toggleStatus = (val: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setSelectedStatuses([]);
  };

  return (
    <>
    <ScrollView style={settingsStyles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={settingsStyles.section}>
        <View style={styles.headerRow}>
          <Text style={settingsStyles.sectionTitle}>My Reports</Text>
          <TouchableOpacity onPress={() => setBugModalVisible(true)} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Report a Bug</Text>
          </TouchableOpacity>
        </View>
        {/* Toolbar */}
        <View style={styles.toolbarCard}>
          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by type, status, description, or response"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.searchInput]}
            />
            <TouchableOpacity onPress={() => setShowAdvanced((v) => !v)} style={styles.filterBtn}>
              <Text style={styles.filterBtnText}>{showAdvanced ? 'Hide' : 'Filters'}</Text>
            </TouchableOpacity>
          </View>

          {/* Sort segmented */}
          <View style={styles.segmented}>
            <TouchableOpacity
              onPress={() => setSortAsc(false)}
              style={[styles.segBtn, !sortAsc && styles.segBtnActive]}
            >
              <Text style={[styles.segText, !sortAsc && styles.segTextActive]}>Newest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSortAsc(true)}
              style={[styles.segBtn, sortAsc && styles.segBtnActive]}
            >
              <Text style={[styles.segText, sortAsc && styles.segTextActive]}>Oldest</Text>
            </TouchableOpacity>
          </View>

          {/* Status chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScrollContent} style={styles.chipsScroll}>
            {STATUS_OPTIONS.map((opt) => {
              const active = selectedStatuses.includes(opt);
              return (
                <TouchableOpacity key={opt} onPress={() => toggleStatus(opt)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{getStatusLabel(opt)}</Text>
                </TouchableOpacity>
              );
            })}
            {selectedStatuses.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedStatuses([])} style={[styles.chip, styles.chipClear]}>
                <Text style={[styles.chipText, styles.chipTextClear]}>Clear</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Actions row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={toggleSelectMode} style={[styles.secondaryBtn]}> 
              <Text style={styles.secondaryBtnText}>{selectMode ? 'Cancel' : 'Select reports to delete'}</Text>
            </TouchableOpacity>
            <View style={{ width: 8 }} />
            <TouchableOpacity onPress={deleteSelected} disabled={!selectMode || selectedIds.size === 0} style={[styles.dangerBtn, (!selectMode || selectedIds.size === 0) && styles.btnDisabled]}> 
              <Text style={[styles.dangerBtnText, (!selectMode || selectedIds.size === 0) && styles.btnTextDisabled]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Advanced filters (collapsible) */}
        {showAdvanced && (
          <View style={styles.advancedCard}>
            <Text style={styles.advancedTitle}>Date range</Text>
            <View style={styles.filtersRow}>
              <TextInput
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="From (YYYY-MM-DD)"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={toDate}
                onChangeText={setToDate}
                placeholder="To (YYYY-MM-DD)"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            <View style={[styles.filtersRow, { justifyContent: 'flex-end' }]}>
              <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}><Text style={styles.clearBtnText}>Reset</Text></TouchableOpacity>
            </View>
          </View>
        )}
        {loading ? (
          <View style={{ paddingVertical: 24 }}><ActivityIndicator /></View>
        ) : error ? (
          <Text style={{ color: '#DC2626' }}>{error}</Text>
        ) : filteredByStatus.length === 0 ? (
          <Text style={{ color: '#6B7280' }}>{emptyMessage}</Text>
        ) : (
          <View>
            {filteredByStatus.map((r) => (
              <TouchableOpacity key={r.id} activeOpacity={0.8} onPress={() => (selectMode ? toggleSelect(r.id) : undefined)} style={[styles.reportItem, selectMode && selectedIds.has(r.id) && styles.reportItemSelected]}>
                {selectMode && (
                  <View style={styles.checkbox}>
                    <View style={[styles.checkboxInner, selectedIds.has(r.id) && styles.checkboxInnerChecked]} />
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.reportType}>{r.type || '—'}</Text>
                  <View style={[styles.statusChip, getStatusStyle(r.status)]}>
                    <Text style={[styles.statusChipText, getStatusTextStyle(r.status)]}>
                      {getStatusLabel(r.status)}
                    </Text>
                  </View>
                </View>
                {r.description ? <Text style={styles.reportDesc}>{r.description}</Text> : null}
                <Text style={styles.reportMeta}>
                  {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '—'}
                </Text>
                <View style={styles.responseBox}>
                  <Text style={styles.responseLabel}>Admin response</Text>
                  <Text style={[styles.responseText, !r.response && styles.responseTextMuted]}>
                    {r.response || "Admin hasn't responded yet."}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
    <BugReportModal
      visible={bugModalVisible}
      onClose={() => setBugModalVisible(false)}
      onSubmitted={load}
    />
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    paddingBottom: 36,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  reportType: { fontWeight: '800', color: '#111827' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E5E7EB' },
  statusChipText: { fontWeight: '700' },
  reportDesc: { marginTop: 6, color: '#374151', lineHeight: 20 },
  reportMeta: { color: '#6B7280', fontSize: 12, marginTop: 6 },
  responseBox: { marginTop: 8, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10 },
  responseLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  responseText: { color: '#111827' },
  responseTextMuted: { color: '#6B7280', fontStyle: 'italic' },

  // Filters
  toolbarCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginTop: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchIcon: { fontSize: 16, color: '#6B7280' },
  searchInput: { flex: 1 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#F3F4F6', borderRadius: 10 },
  filterBtnText: { fontWeight: '700', color: '#111827' },
  segmented: { flexDirection: 'row', marginTop: 10, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4 },
  segBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#FFFFFF' },
  segText: { color: '#374151', fontWeight: '700' },
  segTextActive: { color: '#111827' },
  chipsScroll: { marginTop: 10 },
  chipsScrollContent: { gap: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  primaryBtn: { backgroundColor: '#5B934E', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#111827', fontWeight: '800' },
  dangerBtn: { backgroundColor: '#FEE2E2', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { color: '#991B1B', fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
  btnTextDisabled: { color: '#9CA3AF' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  toggleBtn: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F3F4F6', borderRadius: 10 },
  toggleBtnText: { fontWeight: '700', color: '#111827' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#DCFCE7' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#166534' },
  chipClear: { backgroundColor: '#FEE2E2' },
  chipTextClear: { color: '#991B1B', fontWeight: '800' },
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  clearBtn: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F3F4F6', borderRadius: 10 },
  clearBtnText: { fontWeight: '700', color: '#111827' },
  advancedCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginTop: 8 },
  advancedTitle: { fontWeight: '800', color: '#111827', marginBottom: 6 },
  reportItemSelected: { borderColor: '#5B934E', backgroundColor: '#F8FFF6' },
  checkbox: { position: 'absolute', right: 8, bottom: 8, width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#5B934E', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', zIndex: 2, elevation: 2 },
  checkboxInner: { width: 10, height: 10, borderRadius: 2 },
  checkboxInnerChecked: { backgroundColor: '#5B934E' },
});

// ---- Helpers for status chip ----
function getStatusLabel(status?: string) {
  const s = (status || 'to be reviewed').toLowerCase();
  if (s === 'validated') return 'Validated';
  if (s === 'rejected') return 'Rejected';
  if (s === 'reviewed') return 'Reviewed';
  return 'To be reviewed';
}

function getStatusStyle(status?: string) {
  const s = (status || 'to be reviewed').toLowerCase();
  if (s === 'validated') return { backgroundColor: '#DCFCE7' };
  if (s === 'rejected') return { backgroundColor: '#FEE2E2' };
  if (s === 'reviewed') return { backgroundColor: '#E0E7FF' };
  return { backgroundColor: '#E5E7EB' };
}

function getStatusTextStyle(status?: string) {
  const s = (status || 'to be reviewed').toLowerCase();
  if (s === 'validated') return { color: '#166534' };
  if (s === 'rejected') return { color: '#991B1B' };
  if (s === 'reviewed') return { color: '#1E3A8A' };
  return { color: '#374151' };
}

// Normalize status for filtering and comparisons
function normalizeStatus(status?: string) {
  const s = (status || '').toLowerCase();
  if (!s || s === 'new') return 'to be reviewed';
  return s;
}

export default MyReportsScreen;
