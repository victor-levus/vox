import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type Theme = 'light' | 'dark' | 'system';
export type MeetingLayout = 'grid' | 'spotlight' | 'sidebar';

interface UiState {
  theme: Theme;
  meetingLayout: MeetingLayout;
  isSettingsOpen: boolean;
  isInviteOpen: boolean;
  audioOutputId: string;
}

function loadLayout(): MeetingLayout {
  const v = localStorage.getItem('meetingLayout');
  if (v === 'grid' || v === 'spotlight' || v === 'sidebar') return v;
  return 'grid';
}

const initialState: UiState = {
  theme: 'system',
  meetingLayout: loadLayout(),
  isSettingsOpen: false,
  isInviteOpen: false,
  audioOutputId: '',
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
      localStorage.setItem('meetingLayout', action.payload);
    },
    toggleSettings(state) {
      state.isSettingsOpen = !state.isSettingsOpen;
    },
    toggleInvite(state) {
      state.isInviteOpen = !state.isInviteOpen;
    },
    setAudioOutput(state, action: PayloadAction<string>) {
      state.audioOutputId = action.payload;
    },
  },
});

export const { setTheme, setMeetingLayout, toggleSettings, toggleInvite, setAudioOutput } =
  uiSlice.actions;
export default uiSlice.reducer;
