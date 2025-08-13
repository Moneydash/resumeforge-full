export interface CLFormData {
  sender: {
    name: string;
    email: string;
    phone: string;
    address: string;
    location: string;
    linkedin?: string;
    job_title: string;
  };
  recipient: {
    name: string;
    title: string;
    company: string;
    address: string;
  };
  content: {
    introduction: string;
    body: string;
    closing?: string;
  };
}
