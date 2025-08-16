import knex from "../db/knex";
import { CoverLetterData } from "@/types/interface.cover-letter";

export class CoverLetterModel {
  private tableName = 'user_cover_letter_data';
  private tableExports = 'cover_letter_exports';

  async findByUserId(userId: string): Promise<CoverLetterData[]> {
    try {
      const cover_letters = await knex(this.tableName)
        .where('user_id', userId)
        .whereNull('deleted_at')
        .orderBy('created_at', 'asc');

      return cover_letters || []; // Always returns an array
    } catch (error) {
      console.error('Error finding user by User ID: ', error);
      throw error;
    }
  };

  async findByUserIdSingle(userId: string): Promise<CoverLetterData | null> {
    try {
      const cover_letter = await knex(this.tableName)
        .where('user_id', userId)
        .whereNull('deleted_at')
        .first();

      return cover_letter || null;
    } catch (error) {
      console.error('Error finding user by User ID: ', error);
      throw error;
    }
  };

  async create(coverLetterData: CoverLetterData): Promise<CoverLetterData> {
    try {
      await knex(this.tableName)
        .insert({
          ...coverLetterData,
          created_at: new Date(),
          updated_at: new Date()
        });

      const cover_letter = await this.findByIdAndUserId(coverLetterData.id, coverLetterData.user_id);
      if (!cover_letter) {
        throw new Error('Failed to save the user cover letter data - data not found after creation');
      }

      return cover_letter;
    } catch (error) {
      console.error('Error saving cover letter data: ', error);
      throw error;
    }
  };

  async rename(id: string, userId: string, name: string, slug: string): Promise<CoverLetterData | null> {
    try {
      await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', userId)
        .update({
          cover_letter_name: name,
          cover_letter_slug_name: slug,
          updated_at: new Date()
        });

      const cover_letter = await this.findByIdAndUserId(id, userId);
      return cover_letter;
    } catch (error) {
      console.error('Error renaming resume data: ', error);
      throw error;
    }
  }

  async update(id: string, userId: string, template: string, updateData: Partial<CoverLetterData>): Promise<CoverLetterData | null> {
    try {
      await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', userId)
        .update({
          ...updateData,
          template: template,
          updated_at: new Date()
        });

      const cover_letter = await this.findByIdAndUserId(id, userId);
      return cover_letter;
    } catch (error) {
      console.error('Error updating cover letter data: ', error);
      throw error;
    }
  };

  async updateByUserId(userId: string, template: string, updateData: Partial<CoverLetterData>): Promise<CoverLetterData | null> {
    try {
      await knex(this.tableName)
        .where('user_id', userId)
        .update({
          ...updateData,
          template: template,
          updated_at: new Date()
        });

      const cover_letter = await this.findByUserIdSingle(userId);
      return cover_letter;
    } catch (error) {
      console.error('Error updating cover letter data: ', error);
      throw error;
    }
  };

  async findByIdAndUserId(id: string, userId: string): Promise<CoverLetterData | null> {
    try {
      const cover_letter = await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', userId)
        .whereNull('deleted_at')
        .first()

      return cover_letter || null;
    } catch (error) {
      console.error('Error finding cover letter data: ', error);
      throw error;
    }
  }

  async delete(id: string, user_id: string): Promise<void> {
    try {
      await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', user_id)
        .update({ deleted_at: knex.fn.now() });
    } catch (error) {
      console.error('Error soft deleting cover letter data: ', error);
      throw error;
    }
  }

  async saveExportedCoverLetter(id: string, userId: string, clId: string, template: string): Promise<void> {
    await knex(this.tableExports)
      .insert({
        id: id,
        user_id: userId,
        cover_letter_id: clId,
        export_format: 'pdf',
        template: template,
        created_at: new Date()
      });
  }
}

export const coverletterModel = new CoverLetterModel();