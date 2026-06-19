export interface VideoTemplate {
  id: string;
  title: string;
  description: string;
  category: 'AI Videos' | 'Football Clips' | 'Talking Objects' | 'Viral Shorts';
  duration: string;
  thumbnail_url: string;
  preview_url: string;
  download_url: string;
  viral_style: string;
  views_badge: string;
}

export interface Offer {
  campaign_id: string;
  anchor: string;
  conversion: string;
  url: string;
}

export interface UnlockRecord {
  video_id: string;
  ip: string;
  user_agent: string;
  lead_count: number;
  offer_ids: string[];
  created_at: string;
}

export interface ClickRecord {
  video_id: string;
  offer_id: string;
  ip: string;
  user_agent: string;
  clicked_at: string;
}

export interface AppStats {
  totalVisits: number;
  totalOfferClicks: number;
  totalUnlocks: number;
  conversionRate: number;
  mostUnlockedVideos: { video_id: string; title: string; count: number }[];
  recentUnlocks: { video_id: string; title: string; ip: string; created_at: string }[];
  recentClicks: { video_id: string; title: string; offer_title: string; ip: string; clicked_at: string }[];
}
