import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import queueService from '../../services/queueService';

interface QueueItem {
  id: string;
  eventId: string;
  ticketId: string;
  position: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'no_show';
  checkInTime: string | null;
  startTime: string | null;
  endTime: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
}

interface QueueState {
  queue: QueueItem[];
  currentQueueItem: QueueItem | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: QueueState = {
  queue: [],
  currentQueueItem: null,
  isLoading: false,
  error: null,
};

export const fetchQueueByEvent = createAsyncThunk(
  'queue/fetchQueueByEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      return await queueService.getQueueByEvent(eventId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch queue');
    }
  }
);

export const updateQueueItemStatus = createAsyncThunk(
  'queue/updateQueueItemStatus',
  async ({ id, status }: { id: string; status: QueueItem['status'] }, { rejectWithValue }) => {
    try {
      return await queueService.updateQueueItemStatus(id, status);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update queue item status');
    }
  }
);

export const reorderQueueItem = createAsyncThunk(
  'queue/reorderQueueItem',
  async ({ id, position }: { id: string; position: number }, { rejectWithValue }) => {
    try {
      return await queueService.reorderQueueItem(id, position);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reorder queue item');
    }
  }
);

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setCurrentQueueItem: (state, action: PayloadAction<QueueItem | null>) => {
      state.currentQueueItem = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueueByEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQueueByEvent.fulfilled, (state, action: PayloadAction<QueueItem[]>) => {
        state.isLoading = false;
        state.queue = action.payload;
      })
      .addCase(fetchQueueByEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateQueueItemStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateQueueItemStatus.fulfilled, (state, action: PayloadAction<QueueItem>) => {
        state.isLoading = false;
        const index = state.queue.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.queue[index] = action.payload;
        }
        if (state.currentQueueItem?.id === action.payload.id) {
          state.currentQueueItem = action.payload;
        }
      })
      .addCase(updateQueueItemStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(reorderQueueItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reorderQueueItem.fulfilled, (state, action: PayloadAction<QueueItem[]>) => {
        state.isLoading = false;
        state.queue = action.payload;
      })
      .addCase(reorderQueueItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentQueueItem } = queueSlice.actions;

export default queueSlice.reducer;
