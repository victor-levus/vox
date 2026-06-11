import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type MeetingLayout = 'grid' | 'spotlight';

interface UiState {
  meetingLayout: MeetingLayout;
  isSettingsOpen: boolean;
  isInviteOpen: boolean;
}

const initialState: UiState = {
  meetingLayout: 'grid',
  isSettingsOpen: false,
  isInviteOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMeetingLayout(state, action: PayloadAction<MeetingLayout>) {
      state.meetingLayout = action.payload;
    },
    toggleSettings(state) { state.isSettingsOpen = !state.isSettingsOpen; },
    toggleInvite(state) { state.isInviteOpen = !state.isInviteOpen; },
  },
});

export const { setMeetingLayout, toggleSettings, toggleInvite } = uiSlice.actions;
export default uiSlice.reducer;
