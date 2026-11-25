export type AuthStackParamList = {
  /** Prefilled after a sign-up whose automatic sign-in did not go through. */
  Login: { email?: string } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerificationCode: { email: string };
  NewPassword: { resetToken: string; email?: string };
};

export type RootStackParamList = {
  MainTabs: undefined;
  Calendar: { initialDate?: string } | undefined;
  Membership: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  SlotDetail: { slotId: number };
  VideoPackage: { packageId: number };
  VideoPlayer: { packageId: number; videoId: number };
  BookingConfirmation: {
    trainingType: string;
    date: string;
    hourInit: string;
    hourEnd: string;
  };
  WeightInput: SetupParams;
  WeightHistory: undefined;
  BirthdateInput: SetupParams;
  HeightInput: SetupParams;
  // Community
  /** A training id preselects that session, so sharing one starts from it. */
  CreatePost: { trainingId?: number } | undefined;
  PostDetail: { postId: number };
  UserProfile: { userId: number };
};


/** The profile fields the setup sheet can ask for, in the order it asks. */
export type SetupRoute = 'WeightInput' | 'HeightInput' | 'BirthdateInput';

/** Present only when the screen was opened from the setup sheet. */
type SetupParams = { setupQueue?: SetupRoute[] } | undefined;
