import authRoutes from './routes/auth.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import providerRoutes from './routes/provider.routes.js';

// mount routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/providers', providerRoutes);
