export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerificationCode: { email: string };
};

export type RootStackParamList = {
  MainTabs: undefined;
  Calendar: { initialDate?: string } | undefined;
  Membership: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  SlotDetail: { slotId: number };
  BookingConfirmation: {
    trainingType: string;
    date: string;
    hourInit: string;
    hourEnd: string;
  };
  WeightInput: undefined;
  WeightHistory: undefined;
  BirthdateInput: undefined;
  HeightInput: undefined;
  // Community
  /** A training id preselects that session, so sharing one starts from it. */
  CreatePost: { trainingId?: number } | undefined;
  PostDetail: { postId: number };
  UserProfile: { userId: number };
};

