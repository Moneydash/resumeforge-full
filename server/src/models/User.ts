import { CreateUserData, User } from '@/types/interface.user';
import knex from '../db/knex';


// User model class
export class UserModel {
  private tableName = 'users';

  // Find user by Google ID
  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      const user = await knex(this.tableName)
        .where('google_id', googleId)
        .first();

      return user || null;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw error;
    }
  }

  async findByGithubId(googleId: string): Promise<User | null> {
    try {
      const user = await knex(this.tableName)
        .where('github_id', googleId)
        .first();

      return user || null;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw error;
    }
  }

  // Find user by ID
  async findById(id: string): Promise<User | null> {
    try {
      const user = await knex(this.tableName)
        .where('id', id)
        .first();

      return user || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await knex(this.tableName)
        .where('email', email)
        .first();

      return user || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Create new user
  async create(userData: CreateUserData): Promise<User> {
    try {
      await knex(this.tableName)
        .insert({
          ...userData,
          created_at: new Date(),
          updated_at: new Date()
        });

      // Fetch the created user
      const user = await this.findById(userData.id);
      if (!user) {
        throw new Error('Failed to create user - user not found after creation');
      }

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    try {
      await knex(this.tableName)
        .where('id', id)
        .update({
          ...updateData,
          updated_at: new Date()
        });

      // Fetch the updated user
      const user = await this.findById(id);
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async delete(id: string): Promise<boolean> {
    try {
      const deletedCount = await knex(this.tableName)
        .where('id', id)
        .del();

      return deletedCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get all users (with pagination)
  async findAll(limit: number = 10, offset: number = 0): Promise<User[]> {
    try {
      const users = await knex(this.tableName)
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return users;
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userModel = new UserModel(); 