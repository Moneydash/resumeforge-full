import knex from "../db/knex";
import { ResumeData } from "@/types/interface.resume";

export class ResumeModel {
  private tableName = 'user_resume_data';
  private tableExports = 'resume_exports';

  async findByUserId(userId: string): Promise<ResumeData[]> {
    try {
      const resumes = await knex(this.tableName)
        .where('user_id', userId)
        .whereNull('deleted_at')
        .orderBy('created_at', 'asc');

      return resumes || []; // Always returns an array
    } catch (error) {
      console.error('Error finding user by User ID: ', error);
      throw error;
    }
  };

  async create(resumeData: ResumeData): Promise<ResumeData> {
    try {
      await knex(this.tableName)
        .insert({
          ...resumeData,
          created_at: new Date(),
          updated_at: new Date()
        });

      const resume = await this.findByIdAndUserId(resumeData.id, resumeData.user_id);
      if (!resume) {
        throw new Error('Failed to save the user resume data - data not found after creation');
      }

      return resume;
    } catch (error) {
      console.error('Error saving resume data: ', error);
      throw error;
    }
  };

  async rename(id: string, userId: string, name: string, slug: string): Promise<ResumeData | null> {
    try {
      await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', userId)
        .update({
          resume_name: name,
          resume_slug_name: slug,
          updated_at: new Date()
        });

      const resume = await this.findByIdAndUserId(id, userId);
      return resume;
    } catch (error) {
      console.error('Error renaming resume data: ', error);
      throw error;
    }
  }

  async update(id: string, userId: string, template: string, updateData: Partial<ResumeData>): Promise<ResumeData | null> {
    try {
      await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', userId)
        .update({
          ...updateData,
          template: template,
          updated_at: new Date()
        });

      const resume = await this.findByIdAndUserId(id, userId);
      return resume;
    } catch (error) {
      console.error('Error updating resume data: ', error);
      throw error;
    }
  };

  async findByIdAndUserId(id: string, userId: string): Promise<ResumeData | null> {
    try {
      const resume = await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', userId)
        .whereNull('deleted_at')
        .first()

      return resume || null;
    } catch (error) {
      console.error('Error finding resume data: ', error);
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
      console.error('Error soft deleting resume data: ', error);
      throw error;
    }
  }

  async saveExportedResume(id: string, userId: string, resumeId: string, template: string): Promise<void> {
    await knex(this.tableExports)
      .insert({
        id: id,
        user_id: userId,
        resume_id: resumeId,
        export_format: 'pdf',
        template: template,
        created_at: new Date()
      });
  }
}

export const resumeModel = new ResumeModel();