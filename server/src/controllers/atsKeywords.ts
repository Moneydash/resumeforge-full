import { Controller } from "@/types/types.controller-type";
import type { User } from '@/types/interface.user';
import { atsKeywordsModel } from '../models/AtsKeywords';
import { validateKeywordLists } from '../utils/atsKeywords';

export const get_keywords: Controller = async (req, res) => {
  try {
    const user = req.user as User;
    const keywords = await atsKeywordsModel.get(user.id);
    return res.status(200).json({ success: true, keywords });
  } catch (error) {
    console.error('Failed to load ATS keywords:', error);
    return res.status(500).json({ success: false, error: 'Could not load your saved keywords.' });
  }
};

export const save_keywords: Controller = async (req, res) => {
  try {
    const user = req.user as User;
    const validation = validateKeywordLists(req.body);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    await atsKeywordsModel.save(user.id, validation.value);
    return res.status(200).json({ success: true, keywords: validation.value });
  } catch (error) {
    console.error('Failed to save ATS keywords:', error);
    return res.status(500).json({ success: false, error: 'Could not save your keywords.' });
  }
};
