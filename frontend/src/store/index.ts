import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import deviceSlice from './slices/deviceSlice';
import transferSlice from './slices/transferSlice';
import subscriptionSlice from './slices/subscriptionSlice';
import analyticsSlice from './slices/analyticsSlice';
import notificationSlice from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    device: deviceSlice,
    transfer: transferSlice,
    subscription: subscriptionSlice,
    analytics: analyticsSlice,
    notification: notificationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;