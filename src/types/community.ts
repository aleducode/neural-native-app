// Tipos de reacciones disponibles
export type ReactionType = 'fire' | 'muscle' | 'clap' | 'heart';

export const REACTION_ICONS: Record<ReactionType, { icon: string }> = {
  fire: { icon: 'zap' },
  muscle: { icon: 'award' },
  clap: { icon: 'thumbs-up' },
  heart: { icon: 'heart' },
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  fire: 'Fuego',
  muscle: 'Fuerza',
  clap: 'Aplausos',
  heart: 'Me encanta',
};

// Autor del post
export interface PostAuthor {
  id: number;
  name: string;
  photo_url: string | null;
  initials: string;
}

// Training adjunto (opcional)
export interface PostTraining {
  id: number;
  type: string;
  date: string;
  duration_minutes: number;
}

// Resumen de reacciones por tipo
export interface ReactionsSummary {
  fire: number;
  muscle: number;
  clap: number;
  heart: number;
}

// Post completo
export interface Post {
  id: number;
  author: PostAuthor;
  post_type: 'text' | 'photo' | 'training';
  content: string;
  image_url: string | null;
  training: PostTraining | null;
  reactions_count: number;
  comments_count: number;
  user_reaction: ReactionType | null;
  reactions_summary: ReactionsSummary;
  time_ago: string;
  created: string;
}

// Comentario
export interface Comment {
  id: number;
  author: PostAuthor;
  content: string;
  time_ago: string;
  created: string;
  is_mine: boolean;
}

// Request para crear post
export interface CreatePostRequest {
  content: string;
  training_id?: number;
}

// Respuestas de API
export interface FeedResponse {
  posts: Post[];
  next_page: number | null;
  has_more: boolean;
}

export interface PostDetailResponse {
  post: Post;
}

export interface CommentsResponse {
  comments: Comment[];
}

export interface ReactionResponse {
  success: boolean;
  reactions_count: number;
  reactions_summary: ReactionsSummary;
}
