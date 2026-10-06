import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';
import { failStaleScans } from './modules/scans/scans.service.js';

const PORT = process.env.PORT || 4000;

await mongoose.connect(process.env.MONGO_URI);
console.log('MongoDB connected');
await failStaleScans();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});