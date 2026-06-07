import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '@/types';

interface ChatState {
  messages: Message[];
  unreadCount: number;
  isOpen: boolean;
  typingUsers: { userId: string; name: string }[];
}

const initialState: ChatState = {
  messages: [],
  unreadCount: 0,
  isOpen: false,
  typingUsers: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages(state, action: PayloadAction<Message[]>) {
      state.messages = action.payload;
    },
    addMessage(state, action: PayloadAction<Message>) {
      state.messages.push(action.payload);
      if (!state.isOpen) state.unreadCount += 1;
    },
    toggleChat(state) {
      state.isOpen = !state.isOpen;
      if (state.isOpen) state.unreadCount = 0;
    },
    clearUnread(state) {
      state.unreadCount = 0;
    },
    addTypingUser(state, action: PayloadAction<{ userId: string; name: string }>) {
      if (!state.typingUsers.find((u) => u.userId === action.payload.userId)) {
        state.typingUsers.push(action.payload);
      }
    },
    removeTypingUser(state, action: PayloadAction<string>) {
      state.typingUsers = state.typingUsers.filter((u) => u.userId !== action.payload);
    },
    resetChat() {
      return { ...initialState };
    },
  },
});

export const {
  setMessages,
  addMessage,
  toggleChat,
  clearUnread,
  addTypingUser,
  removeTypingUser,
  resetChat,
} = chatSlice.actions;
export default chatSlice.reducer;
