import { firestore } from '../firebase/firebaseConfig';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export interface AppNotification {
  id?: string;
  type: 'APPLIANCE_LIMIT' | 'GAUGE_LIMIT';
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
  meta?: Record<string, any>;
}

class NotificationsService {
  private col(uid: string) {
    return collection(firestore, 'users', uid, 'notifications');
  }

  async add(uid: string, notification: Omit<AppNotification, 'id'>): Promise<void> {
    await addDoc(this.col(uid), {
      ...notification,
      createdAt: Timestamp.fromDate(notification.createdAt),
    });
  }

  subscribe(uid: string, onChange: (items: AppNotification[]) => void): () => void {
    const q = query(this.col(uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            type: data.type,
            title: data.title,
            body: data.body,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            read: !!data.read,
            meta: data.meta || {},
          } as AppNotification;
        });
        try { onChange(items); } catch {}
      },
      (error) => {
        // Common when auth state changes to logged-out; suppress noisy logs
        // and allow caller cleanup to run.
        if ((error as any)?.code === 'permission-denied') {
          // no-op
          return;
        }
        console.warn('Notifications snapshot error:', error);
      }
    );
    return unsub;
  }

  async delete(uid: string, id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'users', uid, 'notifications', id));
  }

  async deleteMany(uid: string, ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(uid, id)));
  }

  async markRead(uid: string, id: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'users', uid, 'notifications', id), { read: true });
    } catch (e) {
      // Non-fatal
      console.warn('markRead failed:', e);
    }
  }

  async list(uid: string): Promise<AppNotification[]> {
    const q = query(this.col(uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        type: data.type,
        title: data.title,
        body: data.body,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        read: !!data.read,
        meta: data.meta || {},
      } as AppNotification;
    });
  }

  // Prevent duplicate spam by checking last similar notification for same key within the same day
  async hasSimilarToday(uid: string, type: AppNotification['type'], key: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      this.col(uid),
      where('type', '==', type),
      where('meta.key', '==', key)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data() as any;
      const when: Date = data?.createdAt?.toDate?.() || new Date(0);
      if (when >= today) return true;
    }
    return false;
  }
}

export const notificationsService = new NotificationsService();
