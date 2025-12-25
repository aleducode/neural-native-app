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
};

