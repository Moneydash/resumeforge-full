import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import type { KeywordLists } from './keywords';

export const fetchKeywords = async (): Promise<KeywordLists> => {
  const response = await client.get<{ success: boolean; keywords: KeywordLists }>('/ats/keywords');
  return response.data.keywords;
};

export const saveKeywords = async (lists: KeywordLists): Promise<void> => {
  await getCsrfToken();
  await client.put('/ats/keywords', lists);
};
