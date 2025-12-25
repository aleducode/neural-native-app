import api from './client';
import { Slot, CalendarDay, Training } from '../types';

interface SlotsResponse {
  date: string;
  day_name: string;
  already_scheduled: boolean;
  slots: Slot[];
}

interface SlotsResult {
  slots: Slot[];
  alreadyScheduled: boolean;
}

interface CalendarResponse {
  days: CalendarDay[];
}

interface ConfirmedUser {
  id: number;
  name: string;
}

interface SlotDetailResponse {
  slot: Slot;
  confirmed_users: ConfirmedUser[];
  confirmed_count: number;
  user_has_booked: boolean;
  already_scheduled_today: boolean;
}

interface SlotDetailResult {
  slot: Slot;
  confirmedUsers: ConfirmedUser[];
  confirmedCount: number;
  userHasBooked: boolean;
  alreadyScheduledToday: boolean;
}

export const slotsApi = {
  /**
   * Get available slots for a specific date
   */
  async getSlotsByDate(date: string): Promise<{ data?: SlotsResult; error?: string }> {
    const response = await api.get<SlotsResponse>(`/training/slots/?date=${date}`);

    if (response.data) {
      return {
        data: {
          slots: response.data.slots,
          alreadyScheduled: response.data.already_scheduled,
        },
      };
    }

    return { error: response.error };
  },

  /**
   * Get calendar days with availability info
   */
  async getCalendarDays(startDate: string, endDate: string): Promise<{ data?: CalendarDay[]; error?: string }> {
    const response = await api.get<CalendarResponse>(
      `/training/slots/calendar/?start_date=${startDate}&end_date=${endDate}`
    );

    if (response.data) {
      return { data: response.data.days };
    }

    return { error: response.error };
  },

  /**
   * Get slot details
   */
  async getSlotDetail(slotId: number): Promise<{ data?: SlotDetailResult; error?: string }> {
    const response = await api.get<SlotDetailResponse>(`/training/slots/${slotId}/`);

    if (response.data) {
      return {
        data: {
          slot: response.data.slot,
          confirmedUsers: response.data.confirmed_users,
          confirmedCount: response.data.confirmed_count,
          userHasBooked: response.data.user_has_booked,
          alreadyScheduledToday: response.data.already_scheduled_today,
        },
      };
    }

    return { error: response.error };
  },

  /**
   * Book a slot
   */
  async bookSlot(slotId: number): Promise<{ success: boolean; error?: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `/training/book/`,
      { slot_id: slotId }
    );

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  },

  /**
   * Get user's trainings (upcoming and past) with pagination
   */
  async getMyTrainings(
    includePast: boolean = true,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ 
    data?: Training[]; 
    count?: number;
    hasMore?: boolean;
    error?: string 
  }> {
    const params = new URLSearchParams();
    if (includePast) {
      params.append('include_past', 'true');
    }
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const url = `/training/my-trainings/?${params.toString()}`;
    const response = await api.get<{ 
      trainings: Training[];
      count: number;
      limit: number;
      offset: number;
      has_more: boolean;
    }>(url);

    if (response.data) {
      return { 
        data: response.data.trainings,
        count: response.data.count,
        hasMore: response.data.has_more,
      };
    }

    return { error: response.error };
  },

  /**
   * Cancel a training
   */
  async cancelTraining(trainingId: number): Promise<{ success: boolean; error?: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `/training/cancel/`,
      { training_id: trainingId }
    );

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  },
};
