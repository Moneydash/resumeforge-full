export type AdminRole = 'admin' | 'super_admin';

export interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminMe {
  id: string;
  role: AdminRole;
}
