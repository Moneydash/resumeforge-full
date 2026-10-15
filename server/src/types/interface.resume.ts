export interface ResumeData {
  id: string;
  user_id: string;
  resume_name?: string;
  resume_slug_name?: string;
  resume_data?: string;
  template?: string;
  share_token?: string | null;
  share_enabled?: boolean | number; // MySQL returns tinyint
  updated_at?: Date | string;
};