let io = null;

export function setPubSub(socketIoInstance) {
  io = socketIoInstance;
}

export function publishEvent(eventName, { orderId, tenantId, providerId, payload = {} }) {
  if (!io) {
    console.warn('PubSub IO not initialized. Event not emitted:', eventName);
    return;
  }

  // Emit to order room and provider room (if providerId provided)
  if (orderId) io.to(`order:${orderId}`).emit(eventName, payload);
  if (providerId) io.to(`provider:${providerId}`).emit(eventName, payload);

  // Optionally emit a tenant-wide event room
  if (tenantId) io.to(`tenant:${tenantId}`).emit(eventName, payload);
}

export function broadcast(eventName, payload) {
  if (!io) return;
  io.emit(eventName, payload);
}
