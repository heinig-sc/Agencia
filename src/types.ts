export type ContentType = 'post' | 'ad' | 'email' | 'blog' | 'strategy';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  brandName?: string;
  brandDescription?: string;
  targetAudience?: string;
  brandVoice?: string;
  createdAt: string;
}

export interface Client {
  id?: string;
  uid: string;
  name: string;
  description?: string;
  brandVoice?: string;
  targetAudience?: string;
  createdAt: string;
}

export interface MarketingContent {
  id?: string;
  uid: string;
  clientId?: string;
  title: string;
  type: ContentType;
  prompt: string;
  content: string;
  scheduledDate?: string;
  createdAt: string;
}

export interface MarketingImage {
  id?: string;
  uid: string;
  clientId?: string;
  prompt: string;
  imageUrl: string;
  svgCode?: string;
  createdAt: string;
}

export interface MarketingVideo {
  id?: string;
  uid: string;
  clientId?: string;
  prompt: string;
  videoUrl: string;
  videoUri?: string;
  createdAt: string;
}
