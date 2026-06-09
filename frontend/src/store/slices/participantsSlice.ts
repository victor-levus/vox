import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Participant } from '@/types';

interface ParticipantsState {
  participants: Participant[];
  isOpen: boolean;
}

const initialState: ParticipantsState = {
  participants: [],
  isOpen: false,
};

const participantsSlice = createSlice({
  name: 'participants',
  initialState,
  reducers: {
    setParticipants(state, action: PayloadAction<Participant[]>) {
      state.participants = action.payload;
    },
    addParticipant(state, action: PayloadAction<Participant>) {
      if (!state.participants.find((p) => p.userId === action.payload.userId)) {
        state.participants.push(action.payload);
      }
    },
    removeParticipant(state, action: PayloadAction<string>) {
      state.participants = state.participants.filter((p) => p.userId !== action.payload);
    },
    updateParticipant(state, action: PayloadAction<Partial<Participant> & { userId: string }>) {
      const idx = state.participants.findIndex((p) => p.userId === action.payload.userId);
      if (idx !== -1) Object.assign(state.participants[idx], action.payload);
    },
    togglePanel(state) {
      state.isOpen = !state.isOpen;
    },
    transferHost(state, action: PayloadAction<{ newHostUserId: string }>) {
      state.participants.forEach((p) => {
        p.role = p.userId === action.payload.newHostUserId ? 'host' : 'guest';
      });
    },
    resetParticipants() {
      return { ...initialState };
    },
  },
});

export const {
  setParticipants,
  addParticipant,
  removeParticipant,
  updateParticipant,
  transferHost,
  togglePanel,
  resetParticipants,
} = participantsSlice.actions;
export default participantsSlice.reducer;
