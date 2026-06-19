import fs from 'fs';
import path from 'path';
import { UnlockRecord, ClickRecord, AppStats } from '../types';
import { videos } from '../data/videos';

const STORAGE_FILE = path.join(process.cwd(), 'db-storage.json');

interface Schema {
  visits: { ip: string; user_agent: string; timestamp: string }[];
  clicks: ClickRecord[];
  unlocks: UnlockRecord[];
}

function initStorage(): Schema {
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse storage file, resetting database', e);
    }
  }
  const defaultSchema: Schema = { visits: [], clicks: [], unlocks: [] };
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(defaultSchema, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to initialize storage file', e);
  }
  return defaultSchema;
}

function saveStorage(data: Schema) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save to storage file', e);
  }
}

export function recordVisit(ip: string, userAgent: string) {
  const data = initStorage();
  data.visits.push({
    ip,
    user_agent: userAgent,
    timestamp: new Date().toISOString(),
  });
  saveStorage(data);
}

export function recordClick(videoId: string, offerId: string, ip: string, userAgent: string) {
  const data = initStorage();
  data.clicks.push({
    video_id: videoId,
    offer_id: offerId,
    ip,
    user_agent: userAgent,
    clicked_at: new Date().toISOString(),
  });
  saveStorage(data);
}

export function unlockVideo(videoId: string, ip: string, userAgent: string, leadCount: number, offerIds: string[]): boolean {
  const data = initStorage();
  
  // Check if already unlocked for this IP
  const alreadyUnlocked = data.unlocks.some(
    (u) => u.video_id === videoId && u.ip === ip
  );
  
  if (alreadyUnlocked) {
    return true;
  }

  data.unlocks.push({
    video_id: videoId,
    ip,
    user_agent: userAgent,
    lead_count: leadCount,
    offer_ids: offerIds,
    created_at: new Date().toISOString(),
  });
  saveStorage(data);
  return true;
}

export function isUnlocked(videoId: string, ip: string): boolean {
  const data = initStorage();
  return data.unlocks.some((u) => u.video_id === videoId && u.ip === ip);
}

export function getUnlockedStatuses(ip: string): string[] {
  const data = initStorage();
  return data.unlocks
    .filter((u) => u.ip === ip)
    .map((u) => u.video_id);
}

export function getStats(): AppStats {
  const data = initStorage();
  
  const totalVisits = data.visits.length;
  const totalOfferClicks = data.clicks.length;
  const totalUnlocks = data.unlocks.length;
  
  // Conversion Rate: unlocked / clicks % (or clicks / visits). Let's do (unlocks / clicks) * 100 or unlocks / visits.
  // The user states: "conversion rate". Let's show (totalUnlocks / Math.max(1, totalOfferClicks)) * 100 percentage.
  const conversionRate = totalOfferClicks > 0 
    ? Math.round((totalUnlocks / totalOfferClicks) * 1000) / 10 
    : 0;

  // Most unlocked videos
  const unlockCounts: Record<string, number> = {};
  data.unlocks.forEach((u) => {
    unlockCounts[u.video_id] = (unlockCounts[u.video_id] || 0) + 1;
  });

  const mostUnlockedVideos = Object.keys(unlockCounts)
    .map((vId) => {
      const video = videos.find((v) => v.id === vId);
      return {
        video_id: vId,
        title: video ? video.title : vId,
        count: unlockCounts[vId],
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent unlocks (last 10)
  const recentUnlocks = data.unlocks
    .map((u) => {
      const video = videos.find((v) => v.id === u.video_id);
      return {
        video_id: u.video_id,
        title: video ? video.title : u.video_id,
        ip: u.ip,
        created_at: u.created_at,
      };
    })
    .reverse()
    .slice(0, 10);

  // Recent clicks (last 10)
  const recentClicks = data.clicks
    .map((c) => {
      const video = videos.find((v) => v.id === c.video_id);
      return {
        video_id: c.video_id,
        title: video ? video.title : c.video_id,
        offer_title: c.offer_id, // we don't have offer name stored always, so we can display offer url/id
        ip: c.ip,
        clicked_at: c.clicked_at,
      };
    })
    .reverse()
    .slice(0, 10);

  return {
    totalVisits,
    totalOfferClicks,
    totalUnlocks,
    conversionRate,
    mostUnlockedVideos,
    recentUnlocks,
    recentClicks,
  };
}
