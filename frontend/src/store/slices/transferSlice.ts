import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { transferAPI } from '../../services/api';
import { TransferSession } from '../../services/types';

// Use TransferSession from types.ts as the main type
type TransferJob = TransferSession;

interface TransferState {
  jobs: TransferJob[];
  activeJob: TransferJob | null;
  loading: boolean;
  error: string | null;
  history: TransferJob[];
}

const initialState: TransferState = {
  jobs: [],
  activeJob: null,
  loading: false,
  error: null,
  history: []
};

// Async thunks
export const fetchTransferJobs = createAsyncThunk(
  'transfer/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await transferAPI.getTransferHistory();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transfer jobs');
    }
  }
);

export const createTransferJob = createAsyncThunk(
  'transfer/createJob',
  async (jobData: {
    type: TransferJob['type'];
    sourceDeviceId: string;
    targetDeviceId?: string;
    dataTypes: string[];
    settings: TransferJob['settings'];
  }, { rejectWithValue }) => {
    try {
      const response = await transferAPI.startTransfer(jobData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create transfer job');
    }
  }
);

export const startTransfer = createAsyncThunk(
  'transfer/startTransfer',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await transferAPI.getTransferStatus(jobId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start transfer');
    }
  }
);

export const pauseTransfer = createAsyncThunk(
  'transfer/pauseTransfer',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await transferAPI.pauseTransfer(jobId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to pause transfer');
    }
  }
);

export const resumeTransfer = createAsyncThunk(
  'transfer/resumeTransfer',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await transferAPI.resumeTransfer(jobId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resume transfer');
    }
  }
);

export const cancelTransfer = createAsyncThunk(
  'transfer/cancelTransfer',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await transferAPI.cancelTransfer(jobId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel transfer');
    }
  }
);

export const getTransferStatus = createAsyncThunk(
  'transfer/getStatus',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const response = await transferAPI.getTransferStatus(jobId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get transfer status');
    }
  }
);

export const deleteTransferJob = createAsyncThunk(
  'transfer/deleteJob',
  async (jobId: string, { rejectWithValue }) => {
    try {
      await transferAPI.cancelTransfer(jobId);
      return jobId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete transfer job');
    }
  }
);

const transferSlice = createSlice({
  name: 'transfer',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setActiveJob: (state, action: PayloadAction<TransferJob | null>) => {
      state.activeJob = action.payload;
    },
    updateJobProgress: (state, action: PayloadAction<{
      jobId: string;
      progress: number;
      transferredSize: number;
      speed: number;
      estimatedTimeRemaining: number;
    }>) => {
      const { jobId, progress, transferredSize, speed, estimatedTimeRemaining } = action.payload;
      
      // Update in jobs array
      const jobIndex = state.jobs.findIndex(job => job.id === jobId);
      if (jobIndex >= 0) {
        state.jobs[jobIndex].progress = progress;
        state.jobs[jobIndex].transferredSize = transferredSize;
        state.jobs[jobIndex].speed = speed;
        state.jobs[jobIndex].estimatedTimeRemaining = estimatedTimeRemaining;
      }
      
      // Update active job if it matches
      if (state.activeJob?.id === jobId) {
        state.activeJob.progress = progress;
        state.activeJob.transferredSize = transferredSize;
        state.activeJob.speed = speed;
        state.activeJob.estimatedTimeRemaining = estimatedTimeRemaining;
      }
    },
    updateJobStatus: (state, action: PayloadAction<{
      jobId: string;
      status: TransferJob['status'];
      error?: string;
    }>) => {
      const { jobId, status, error } = action.payload;
      
      // Update in jobs array
      const jobIndex = state.jobs.findIndex(job => job.id === jobId);
      if (jobIndex >= 0) {
        state.jobs[jobIndex].status = status;
        if (error) {
          state.jobs[jobIndex].error = error;
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          state.jobs[jobIndex].completedAt = new Date().toISOString();
        }
      }
      
      // Update active job if it matches
      if (state.activeJob?.id === jobId) {
        state.activeJob.status = status;
        if (error) {
          state.activeJob.error = error;
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          state.activeJob.completedAt = new Date().toISOString();
        }
      }
    },
    clearJobs: (state) => {
      state.jobs = [];
      state.activeJob = null;
      state.history = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch transfer jobs
      .addCase(fetchTransferJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransferJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload.filter((job: TransferJob) => 
          job.status === 'pending' || job.status === 'in_progress'
        );
        state.history = action.payload.filter((job: TransferJob) => 
          job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
        );
      })
      .addCase(fetchTransferJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create transfer job
      .addCase(createTransferJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTransferJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.push(action.payload);
        state.activeJob = action.payload;
      })
      .addCase(createTransferJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Start transfer
      .addCase(startTransfer.fulfilled, (state, action) => {
        const updatedJob = action.payload;
        const index = state.jobs.findIndex(job => job.id === updatedJob.id);
        if (index >= 0) {
          state.jobs[index] = updatedJob;
        }
        if (state.activeJob?.id === updatedJob.id) {
          state.activeJob = updatedJob;
        }
      })
      .addCase(startTransfer.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Pause transfer
      .addCase(pauseTransfer.fulfilled, (state, action) => {
        const updatedJob = action.payload;
        const index = state.jobs.findIndex(job => job.id === updatedJob.id);
        if (index >= 0) {
          state.jobs[index] = updatedJob;
        }
        if (state.activeJob?.id === updatedJob.id) {
          state.activeJob = updatedJob;
        }
      })
      
      // Resume transfer
      .addCase(resumeTransfer.fulfilled, (state, action) => {
        const updatedJob = action.payload;
        const index = state.jobs.findIndex(job => job.id === updatedJob.id);
        if (index >= 0) {
          state.jobs[index] = updatedJob;
        }
        if (state.activeJob?.id === updatedJob.id) {
          state.activeJob = updatedJob;
        }
      })
      
      // Cancel transfer
      .addCase(cancelTransfer.fulfilled, (state, action) => {
        const updatedJob = action.payload;
        if (updatedJob && typeof updatedJob === 'object' && 'id' in updatedJob) {
          const index = state.jobs.findIndex(job => job.id === updatedJob.id);
          if (index >= 0) {
            state.jobs.splice(index, 1);
            state.history.push(updatedJob);
          }
          if (state.activeJob?.id === updatedJob.id) {
            state.activeJob = null;
          }
        }
      })
      
      // Get transfer status
      .addCase(getTransferStatus.fulfilled, (state, action) => {
        const updatedJob = action.payload;
        const index = state.jobs.findIndex(job => job.id === updatedJob.id);
        if (index >= 0) {
          state.jobs[index] = updatedJob;
        }
        if (state.activeJob?.id === updatedJob.id) {
          state.activeJob = updatedJob;
        }
        
        // Move to history if completed
        if (updatedJob.status === 'completed' || updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
          if (index >= 0) {
            state.jobs.splice(index, 1);
            state.history.push(updatedJob);
          }
          if (state.activeJob?.id === updatedJob.id) {
            state.activeJob = null;
          }
        }
      })
      
      // Delete transfer job
      .addCase(deleteTransferJob.fulfilled, (state, action) => {
        const jobId = action.payload;
        state.jobs = state.jobs.filter(job => job.id !== jobId);
        state.history = state.history.filter(job => job.id !== jobId);
        if (state.activeJob?.id === jobId) {
          state.activeJob = null;
        }
      })
      .addCase(deleteTransferJob.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const {
  clearError,
  setActiveJob,
  updateJobProgress,
  updateJobStatus,
  clearJobs
} = transferSlice.actions;

export default transferSlice.reducer;