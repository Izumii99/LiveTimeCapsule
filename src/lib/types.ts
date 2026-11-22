import type { CapsuleAuthor, MemoryCategory } from "@/config/capsule";

export interface MemoryNote {
  id: string;
  memory_id: string;
  author: CapsuleAuthor;
  content: string;
  created_at: string;
}

export interface MemoryItem {
  id: string;
  title: string;
  caption: string | null;
  image_url: string;
  storage_path: string;
  category: MemoryCategory;
  author: CapsuleAuthor;
  memory_date: string;
  unlock_at: string | null;
  created_at: string;
  notes_count: number;
}

export interface GiftedItem {
  id: string;
  name: string;
  image_url: string | null;
  storage_path: string | null;
  lore_note: string;
  gifted_date: string;
  created_at: string;
}

export interface ChatMessageLine {
  sender: string;
  text: string;
  date_time?: string;
}

export interface ChatHighlight {
  id: string;
  title: string;
  messages: ChatMessageLine[];
  created_at: string;
}
