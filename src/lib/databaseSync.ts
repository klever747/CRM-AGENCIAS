// Frontend Database Real-Time Sync & Live Event Dispatcher

export type SyncEntityType = 
  | 'leads' 
  | 'citas' 
  | 'proyectos' 
  | 'usuarios' 
  | 'agencias' 
  | 'proformas' 
  | 'reservas' 
  | 'ventas' 
  | 'metas'
  | 'dashboard' 
  | 'audit' 
  | 'whatsapp' 
  | 'roles-permisos' 
  | 'objections'
  | 'settings'
  | 'all';

export interface DbChangeEventDetail {
  entity: SyncEntityType;
  timestamp: number;
  version?: number;
  data?: any;
}

// Global CustomEvent dispatcher for database changes
export function notifyDbChange(entity: SyncEntityType, data?: any) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent<DbChangeEventDetail>('app:database-sync', {
    detail: {
      entity,
      timestamp: Date.now(),
      data
    }
  });
  window.dispatchEvent(event);
}

// Global listener helper for any component to automatically refresh on DB mutations
export function subscribeToDbSync(
  targetEntities: SyncEntityType | SyncEntityType[], 
  callback: (detail: DbChangeEventDetail) => void
) {
  if (typeof window === 'undefined') return () => {};
  
  const entities = Array.isArray(targetEntities) ? targetEntities : [targetEntities];

  const handler = (evt: Event) => {
    const customEvt = evt as CustomEvent<DbChangeEventDetail>;
    if (!customEvt.detail) return;
    const { entity } = customEvt.detail;
    if (entity === 'all' || entities.includes('all') || entities.includes(entity)) {
      callback(customEvt.detail);
    }
  };

  window.addEventListener('app:database-sync', handler);
  return () => {
    window.removeEventListener('app:database-sync', handler);
  };
}

// Global SSE Stream Listener that connects to /api/sync/stream
let activeEventSource: EventSource | null = null;
let reconnectTimer: any = null;

export function initLiveSyncStream(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (activeEventSource) return () => {};

  function connect() {
    try {
      if (activeEventSource) {
        activeEventSource.close();
      }

      activeEventSource = new EventSource('/api/sync/stream');

      activeEventSource.onopen = () => {
        // SSE connected
      };

      activeEventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.entity) {
            notifyDbChange(payload.entity, payload);
          }
        } catch (e) {
          // ignore parsing error or ping comment
        }
      };

      activeEventSource.onerror = () => {
        if (activeEventSource) {
          activeEventSource.close();
          activeEventSource = null;
        }
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3000);
      };
    } catch (err) {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    }
  }

  connect();

  return () => {
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }
    clearTimeout(reconnectTimer);
  };
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  initLiveSyncStream();
}
