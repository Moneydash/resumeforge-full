import client from './axiosInstance';

export const formRequest = async (method: string, url: string, data: object) => {
  return client(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    data: data,
    responseType: 'blob',
    withCredentials: true
  });
};