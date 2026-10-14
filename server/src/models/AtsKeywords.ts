import knex from '../db/knex';
import { generateId } from '../utils/helper';
import type { KeywordLists } from '../utils/atsKeywords';

// mysql2 returns JSON columns parsed, but MariaDB stores JSON as text, so accept both.
const parseList = (value: unknown): string[] => {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
};

export class AtsKeywordsModel {
  private tableName = 'ats_keyword_preferences';

  /** No row yet means the user has not saved anything: both lists are empty. */
  async get(userId: string): Promise<KeywordLists> {
    try {
      const row = await knex(this.tableName).where('user_id', userId).first();
      if (!row) return { active: [], suggested: [] };
      return { active: parseList(row.active_keywords), suggested: parseList(row.suggested_keywords) };
    } catch (error) {
      console.error('Error reading ATS keyword preferences:', error);
      throw error;
    }
  }

  async save(userId: string, lists: KeywordLists): Promise<void> {
    try {
      await knex(this.tableName)
        .insert({
          id: generateId(),
          user_id: userId,
          active_keywords: JSON.stringify(lists.active),
          suggested_keywords: JSON.stringify(lists.suggested),
        })
        .onConflict('user_id')
        .merge({
          active_keywords: JSON.stringify(lists.active),
          suggested_keywords: JSON.stringify(lists.suggested),
          updated_at: knex.fn.now(),
        });
    } catch (error) {
      console.error('Error saving ATS keyword preferences:', error);
      throw error;
    }
  }
}

export const atsKeywordsModel = new AtsKeywordsModel();
