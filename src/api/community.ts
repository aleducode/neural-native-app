import { Platform } from 'react-native';
import api from './client';
import { getToken } from '../utils/storage';
import { API_BASE } from '../constants/config';
import {
  Post,
  FeedResponse,
  PostDetailResponse,
  Comment,
  CommentsResponse,
  ReactionType,
  ReactionResponse,
  CreatePostRequest,
} from '../types/community';

export const communityApi = {
  // ============ FEED ============

  getFeed: async (page: number = 1) => {
    return api.get<FeedResponse>(`/community/feed/?page=${page}`);
  },

  // ============ POSTS ============

  createPost: async (data: CreatePostRequest) => {
    return api.post<Post>('/community/posts/', data);
  },

  createPostWithImage: async (
    content: string,
    imageUri: string,
    fileName: string,
    mimeType: string = 'image/jpeg'
  ) => {
    const token = await getToken();

    const formData = new FormData();
    formData.append('content', content);

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('image', blob, fileName);
      } catch (e) {
        console.error('Error creating blob:', e);
        return { error: 'Error al procesar la imagen' };
      }
    } else {
      const uri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
      formData.append('image', {
        uri: uri,
        type: mimeType,
        name: fileName,
      } as any);
    }

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`${API_BASE}/community/posts/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse response:', responseText);
        return { error: 'Error en la respuesta del servidor' };
      }

      if (!response.ok) {
        return {
          error: data.message || data.detail || data.error || 'Error al crear la publicación',
        };
      }

      return { data: data as Post };
    } catch (error) {
      console.error('API Upload Error:', error);
      return { error: 'Error de conexión. Verifica tu internet.' };
    }
  },

  getPostDetail: async (postId: number) => {
    return api.get<PostDetailResponse>(`/community/posts/${postId}/`);
  },

  deletePost: async (postId: number) => {
    return api.delete(`/community/posts/${postId}/`);
  },

  // ============ REACTIONS ============

  addReaction: async (postId: number, reactionType: ReactionType) => {
    return api.post<ReactionResponse>(`/community/posts/${postId}/react/`, {
      reaction_type: reactionType,
    });
  },

  removeReaction: async (postId: number) => {
    return api.delete<ReactionResponse>(`/community/posts/${postId}/react/`);
  },

  // ============ COMMENTS ============

  getComments: async (postId: number) => {
    return api.get<CommentsResponse>(`/community/posts/${postId}/comments/`);
  },

  addComment: async (postId: number, content: string) => {
    return api.post<Comment>(`/community/posts/${postId}/comments/`, { content });
  },

  deleteComment: async (commentId: number) => {
    return api.delete(`/community/comments/${commentId}/`);
  },

  // ============ USER PROFILE ============

  getUserProfile: async (userId: number) => {
    return api.get<UserPublicProfile>(`/community/users/${userId}/`);
  },
};

// Types
export interface UserPublicProfile {
  id: number;
  /** Null when the member never set one — the server no longer sends the email. */
  name: string | null;
  first_name: string;
  last_name: string;
  /** Two letters for the avatar, sent when there is no name to take them from. */
  initials?: string;
  photo_url: string | null;
  instagram: string | null;
  profession: string | null;
  member_since: string | null;
  stats: {
    total_trainings: number;
    current_strike: number;
    posts_count: number;
  };
  recent_posts: Post[];
}

export default communityApi;
