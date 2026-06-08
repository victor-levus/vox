import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type Theme = 'light' | 'dark' | 'system';
type MeetingLayout = 'grid' | 'spotlight' | 'sidebar';

interface UiState {
  theme: Theme;
  meetingLayout: MeetingLayout;
  isSettingsOpen: boolean;
  isInviteOpen: boolean;
}

const initialState: UiState = {
  theme: 'system',
  meetingLayout: 'grid',
  isSettingsOpen: false,
  isInviteOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    setMeetingLayout(state, action: PayloadAction<MeetingLayout>) {
      state.meetingLayout = action.payload;
    },
    toggleSettings(state) {
      state.isSettingsOpen = !state.isSettingsOpen;
    },
    toggleInvite(state) {
      state.isInviteOpen = !state.isInviteOpen;
    },
  },
});

export const { setTheme, setMeetingLayout, toggleSettings, toggleInvite } = uiSlice.actions;
export default uiSlice.reducer;
