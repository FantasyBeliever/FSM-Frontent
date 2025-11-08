export interface OfflineAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE'; // queue only handles write actions
  body?: any;
  timestamp: number;
}
