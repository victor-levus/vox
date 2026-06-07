import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface MeetingState {
  roomCode: string | null;
  roomName: string | null;
  roomId: string | null;
  isActive: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
  joinedAt: string | null;
}

const initialState: MeetingState = {
  roomCode: null,
  roomName: null,
  roomId: null,
  isActive: false,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isRecording: false,
  isHandRaised: false,
  joinedAt: null,
};

const meetingSlice = createSlice({
  name: 'meeting',
  initialState,
  reducers: {
    joinMeeting(state, action: PayloadAction<{ roomCode: string; roomName: string; roomId: string }>) {
      state.roomCode = action.payload.roomCode;
      state.roomName = action.payload.roomName;
      state.roomId = action.payload.roomId;
      state.isActive = true;
      state.joinedAt = new Date().toISOString();
    },
    leaveMeeting() {
      return { ...initialState };
    },
    toggleMute(state) {
      state.isMuted = !state.isMuted;
    },
    toggleCamera(state) {
      state.isCameraOff = !state.isCameraOff;
    },
    setScreenSharing(state, action: PayloadAction<boolean>) {
      state.isScreenSharing = action.payload;
    },
    setRecording(state, action: PayloadAction<boolean>) {
      state.isRecording = action.payload;
    },
    toggleHandRaise(state) {
      state.isHandRaised = !state.isHandRaised;
    },
  },
});

export const {
  joinMeeting,
  leaveMeeting,
  toggleMute,
  toggleCamera,
  setScreenSharing,
  setRecording,
  toggleHandRaise,
} = meetingSlice.actions;
export default meetingSlice.reducer;
