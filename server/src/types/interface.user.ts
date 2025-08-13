export interface User {
  id: string;
  google_id?: string;
  github_id?: string;
  email: string;
  name: string;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
};

export interface CreateUserData {
  id: string;
  google_id?: string;
  github_id?: string;
  email: string;
  name: string;
  avatar?: string;
};