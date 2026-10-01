export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  school: string;
  program: string;
  year_level: number;
  bio: string;
  avatar_url: string | null;
  is_tutor: boolean;
  tutor_subjects: string[];
  tutor_rate: number;
  tutor_about: string;
  plus_until: string | null;
  created_at: string;
};

export type PostType = 'need_tutor' | 'offer_tutoring' | 'general';

export type Post = {
  id: string;
  author_id: string;
  type: PostType;
  subject: string;
  body: string;
  budget: number | null;
  boosted_until: string | null;
  created_at: string;
  author?: Profile;
  comments?: { count: number }[];
};

export type Comment = {
  id: string;
  post_id: string | null;
  listing_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  author?: Profile;
};

export type ListingStatus = 'available' | 'reserved' | 'on_loan' | 'sold';

export type Listing = {
  id: string;
  seller_id: string;
  category: 'book' | 'calculator';
  mode: 'sale' | 'rent';
  title: string;
  book_author: string;
  description: string;
  condition: string;
  price: number;
  deposit: number;
  photo_url: string | null;
  meetup_spot: string;
  status: ListingStatus;
  boosted_until: string | null;
  created_at: string;
  seller?: Profile;
};

export type BookingStatus = 'requested' | 'accepted' | 'paid' | 'completed' | 'declined' | 'cancelled';

export type Booking = {
  id: string;
  student_id: string;
  tutor_id: string;
  subject: string;
  starts_at: string;
  duration_min: number;
  location: string;
  notes: string;
  amount: number;
  fee: number;
  status: BookingStatus;
  created_at: string;
  student?: Profile;
  tutor?: Profile;
};

export type Order = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  kind: 'buy' | 'rent';
  weeks: number;
  amount: number;
  deposit: number;
  fee: number;
  status: 'paid' | 'completed' | 'returned' | 'cancelled';
  due_at: string | null;
  created_at: string;
  listing?: Listing;
  buyer?: Profile;
  seller?: Profile;
};

export type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type Rating = { user_id: string; role: string; avg_stars: number; review_count: number };

export type Review = {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  role: string;
  stars: number;
  comment: string;
  created_at: string;
  reviewer?: Profile;
};
