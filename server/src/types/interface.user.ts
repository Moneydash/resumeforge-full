export interface User {
  id: string;
  google_id?: string;
  github_id?: string;
  linkedin_id?: string;
  email: string;
  name: string;
  avatar?: string;
  role?: 'user' | 'admin' | 'super_admin';
  super_admin_slot?: number | null;
  created_at?: Date;
  updated_at?: Date;
};

export interface CreateUserData {
  id: string;
  google_id?: string;
  github_id?: string;
  linkedin_id?: string;
  email: string;
  name: string;
  avatar?: string;
};