import { userModel } from '../models/User';
import { generateId } from './helper';
import { CreateUserData, User } from '@/types/interface.user';

// Response of GET /v2/userinfo for "Sign In with LinkedIn using OpenID Connect"
export interface LinkedinUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
}

export const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

export async function fetchLinkedinUserInfo(accessToken: string): Promise<LinkedinUserInfo> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`LinkedIn userinfo request failed with status ${response.status}`);
  }

  return (await response.json()) as LinkedinUserInfo;
}

/**
 * Find, link or create the local user for a LinkedIn profile.
 * A new account is only created, and an existing one only linked by email, when LinkedIn reports the
 * email as verified; otherwise anyone could take over an account (or claim a role granted to an address)
 * by registering that address on LinkedIn.
 */
export async function resolveLinkedinUser(profile: LinkedinUserInfo): Promise<User> {
  if (!profile?.sub) {
    throw new Error('Invalid profile received from LinkedIn');
  }

  const existing = await userModel.findByLinkedinId(profile.sub);
  if (existing) {
    return existing;
  }

  if (!profile.email) {
    throw new Error('Email is required for registration');
  }

  if (!profile.email_verified) {
    throw new Error('LinkedIn email is not verified');
  }

  const byEmail = await userModel.findByEmail(profile.email);
  if (byEmail) {
    const linked = await userModel.update(byEmail.id, { linkedin_id: profile.sub });
    if (!linked) {
      throw new Error('Failed to link LinkedIn account');
    }
    return linked;
  }

  const newUserData: CreateUserData = {
    id: generateId(),
    linkedin_id: profile.sub,
    email: profile.email,
    name: profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ') || 'LinkedIn User',
    avatar: profile.picture || ''
  };

  return userModel.create(newUserData);
}
