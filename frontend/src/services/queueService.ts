import api from './api';

const getQueueByEvent = async (eventId: string) => {
  const response = await api.get(`/queue/event/${eventId}`);
  return response.data;
};

const updateQueueItemStatus = async (id: string, status: string) => {
  const response = await api.patch(`/queue/${id}/status`, { status });
  return response.data;
};

const reorderQueueItem = async (id: string, position: number) => {
  const response = await api.patch(`/queue/${id}/position`, { position });
  return response.data;
};

const queueService = {
  getQueueByEvent,
  updateQueueItemStatus,
  reorderQueueItem,
};

export default queueService;
