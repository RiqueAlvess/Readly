// Core domain types for Readly

export type BookStatus = "reading" | "read" | "want_to_read" | "abandoned";
export type RarityTier = "common" | "rare" | "legendary";
export type EntryType = "quote" | "reflection" | "note";
export type SubscriptionStatus = "active" | "inactive" | "expired" | "trial";
export type CreditTxType = "earn" | "spend";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  xp: number;
  rank: string;
  credits: number;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  annual_goal: number;
  monthly_book_limit: number;
  monthly_books_purchased: number;
  is_admin: boolean;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  genre: string | null;
  isbn: string | null;
  page_count: number | null;
  published_year: number | null;
  rating_avg: number;
  rarity_tier: RarityTier;
  gacha_weight: number;
  price_credits: number;
  created_at: string;
}

export interface UserBook {
  id: string;
  user_id: string;
  book_id: string;
  status: BookStatus;
  is_favorite: boolean;
  pages_read: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  book?: Book;
}

export interface BookReview {
  id: string;
  user_id: string;
  book_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number | null;
  content: string;
  entry_type: EntryType;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  created_at: string;
  book_count?: number;
}

export interface Post {
  id: string;
  user_id: string;
  book_id: string | null;
  content: string;
  has_spoiler: boolean;
  is_spoiler_revealed: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: Profile;
  book?: Book;
  liked_by_me?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  equipped: boolean;
  earned_at: string;
  badge?: Badge;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface GachaInventoryItem {
  id: string;
  user_id: string;
  book_id: string;
  is_downloaded: boolean;
  acquired_at: string;
  book?: Book;
  is_listed?: boolean;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  inventory_item_id: string;
  book_id: string;
  created_at: string;
  is_active: boolean;
  book?: Book;
  seller?: Profile;
}

export interface MarketplaceOffer {
  id: string;
  listing_id: string;
  offerer_id: string;
  offered_inventory_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface Championship {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  prize_description: string | null;
  created_at: string;
}

export interface ChampionshipParticipant {
  championship_id: string;
  user_id: string;
  score: number;
  rank: number | null;
  joined_at: string;
  profile?: Profile;
}

export interface LootboxType {
  id: string;
  name: string;
  description: string | null;
  genre_filter: string | null;
  cost_credits: number;
  rarity_chances: { common: number; rare: number; legendary: number };
  icon: string;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  action_type: string;
  reference_id: string | null;
  created_at: string;
}

export interface ReadingGoal {
  id: string;
  user_id: string;
  type: "annual" | "monthly";
  target: number;
  current: number;
  year: number;
  month: number | null;
  created_at: string;
}

export interface UserBookSubmission {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  genre: string | null;
  isbn: string | null;
  page_count: number | null;
  published_year: number | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
