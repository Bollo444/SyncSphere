import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { subscriptionAPI } from '../../services/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    dataRecoveryLimit: number; // -1 for unlimited
    phoneTransferLimit: number; // -1 for unlimited
    storageLimit: number; // in GB, -1 for unlimited
    deviceLimit: number; // -1 for unlimited
    prioritySupport: boolean;
    advancedFeatures: boolean;
  };
  popular: boolean;
  active: boolean;
}

interface UserSubscription {
  id: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  usage: {
    dataRecoveries: number;
    phoneTransfers: number;
    storageUsed: number; // in GB
    devicesConnected: number;
  };
  paymentMethod?: {
    type: 'card' | 'paypal';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoiceDate: string;
  dueDate: string;
  paidAt?: string;
  downloadUrl?: string;
}

interface SubscriptionState {
  plans: SubscriptionPlan[];
  currentSubscription: UserSubscription | null;
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  upgradeLoading: boolean;
  cancelLoading: boolean;
}

const initialState: SubscriptionState = {
  plans: [],
  currentSubscription: null,
  invoices: [],
  loading: false,
  error: null,
  upgradeLoading: false,
  cancelLoading: false
};

// Async thunks
export const fetchSubscriptionPlans = createAsyncThunk(
  'subscription/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.getPlans();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription plans');
    }
  }
);

export const fetchCurrentSubscription = createAsyncThunk(
  'subscription/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.getCurrentSubscription();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch current subscription');
    }
  }
);

export const createSubscription = createAsyncThunk(
  'subscription/create',
  async (data: {
    planId: string;
    paymentMethodId: string;
    couponCode?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.subscribe(data.planId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create subscription');
    }
  }
);

export const upgradeSubscription = createAsyncThunk(
  'subscription/upgrade',
  async (data: {
    planId: string;
    paymentMethodId?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.subscribe(data.planId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upgrade subscription');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscription/cancel',
  async (data: {
    cancelAtPeriodEnd: boolean;
    reason?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.cancelSubscription();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel subscription');
    }
  }
);

export const reactivateSubscription = createAsyncThunk(
  'subscription/reactivate',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.put('/subscriptions/reactivate');
      return response.data.subscription;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reactivate subscription');
    }
  }
);

export const updatePaymentMethod = createAsyncThunk(
  'subscription/updatePaymentMethod',
  async (paymentMethodId: string, { rejectWithValue }) => {
    try {
      const response = await api.put('/subscriptions/payment-method', { paymentMethodId });
      return response.data.subscription;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update payment method');
    }
  }
);

export const fetchInvoices = createAsyncThunk(
  'subscription/fetchInvoices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/subscriptions/invoices');
      return response.data.invoices;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoices');
    }
  }
);

export const downloadInvoice = createAsyncThunk(
  'subscription/downloadInvoice',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/subscriptions/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return 'Invoice downloaded successfully';
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download invoice');
    }
  }
);

export const validateCoupon = createAsyncThunk(
  'subscription/validateCoupon',
  async (data: { couponCode: string; planId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/subscriptions/validate-coupon', data);
      return response.data.coupon;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Invalid coupon code');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUsage: (state, action: PayloadAction<Partial<UserSubscription['usage']>>) => {
      if (state.currentSubscription) {
        state.currentSubscription.usage = {
          ...state.currentSubscription.usage,
          ...action.payload
        };
      }
    },
    clearSubscription: (state) => {
      state.currentSubscription = null;
      state.invoices = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch subscription plans
      .addCase(fetchSubscriptionPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchSubscriptionPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch current subscription
      .addCase(fetchCurrentSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSubscription = action.payload;
      })
      .addCase(fetchCurrentSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create subscription
      .addCase(createSubscription.pending, (state) => {
        state.upgradeLoading = true;
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.upgradeLoading = false;
        state.currentSubscription = action.payload;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.upgradeLoading = false;
        state.error = action.payload as string;
      })
      
      // Upgrade subscription
      .addCase(upgradeSubscription.pending, (state) => {
        state.upgradeLoading = true;
        state.error = null;
      })
      .addCase(upgradeSubscription.fulfilled, (state, action) => {
        state.upgradeLoading = false;
        state.currentSubscription = action.payload;
      })
      .addCase(upgradeSubscription.rejected, (state, action) => {
        state.upgradeLoading = false;
        state.error = action.payload as string;
      })
      
      // Cancel subscription
      .addCase(cancelSubscription.pending, (state) => {
        state.cancelLoading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        state.cancelLoading = false;
        // cancelSubscription returns { message: string }, not a subscription object
        // Update the current subscription status to indicate cancellation
        if (state.currentSubscription) {
          state.currentSubscription.status = 'cancelled';
          state.currentSubscription.cancelAtPeriodEnd = true;
        }
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.cancelLoading = false;
        state.error = action.payload as string;
      })
      
      // Reactivate subscription
      .addCase(reactivateSubscription.pending, (state) => {
        state.upgradeLoading = true;
        state.error = null;
      })
      .addCase(reactivateSubscription.fulfilled, (state, action) => {
        state.upgradeLoading = false;
        state.currentSubscription = action.payload;
      })
      .addCase(reactivateSubscription.rejected, (state, action) => {
        state.upgradeLoading = false;
        state.error = action.payload as string;
      })
      
      // Update payment method
      .addCase(updatePaymentMethod.pending, (state) => {
        state.upgradeLoading = true;
        state.error = null;
      })
      .addCase(updatePaymentMethod.fulfilled, (state, action) => {
        state.upgradeLoading = false;
        state.currentSubscription = action.payload;
      })
      .addCase(updatePaymentMethod.rejected, (state, action) => {
        state.upgradeLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch invoices
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.invoices = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Download invoice
      .addCase(downloadInvoice.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Validate coupon
      .addCase(validateCoupon.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const {
  clearError,
  updateUsage,
  clearSubscription
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;