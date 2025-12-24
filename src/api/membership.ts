import api from './client';

export interface NeuralPlan {
  id: number;
  name: string;
  slug_name: string;
  description: string;
  price: number;
  duration: number;
}

export interface UserMembership {
  id: number;
  membership_type: 'MENSUAL' | 'QUARTER' | 'SEMESTER';
  plan: NeuralPlan | null;
  is_active: boolean;
  init_date: string;
  expiration_date: string;
  days_left: number;
}

export interface MembershipResponse {
  current_membership: UserMembership | null;
  available_plans: NeuralPlan[];
}

export const membershipApi = {
  /**
   * Get current membership and available plans
   */
  async getMembership(): Promise<{ data?: MembershipResponse; error?: string }> {
    return api.get<MembershipResponse>('/membership/');
  },

  /**
   * Create a payment reference for a plan
   */
  async createPayment(planId: number): Promise<{
    data?: {
      reference: string;
      amount: number;
      currency: string;
      integrity_signature: string;
      bold_public_key: string;
      plan: NeuralPlan;
    };
    error?: string;
  }> {
    return api.post('/membership/create-payment/', { plan_id: planId });
  },

  /**
   * Verify a payment
   */
  async verifyPayment(orderId: string, txStatus: string): Promise<{
    data?: {
      success: boolean;
      message: string;
      membership?: {
        plan_name: string;
        expiration_date: string;
        days_left: number;
      };
    };
    error?: string;
  }> {
    return api.post('/membership/verify-payment/', {
      order_id: orderId,
      tx_status: txStatus,
    });
  },
};

export default membershipApi;
