require('dotenv').config(); // Must be at the VERY TOP

const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ======================
// Environment Variables Check
// ======================
const PORT = process.env.PORT || 5000; // Fallback to 5000 if not set
const MONGODB_URI = process.env.MONGOCONNECTION || process.env.MONGODB_URI; // Support both names

if (!MONGODB_URI) {
  console.error(
    '❌ FATAL ERROR: MongoDB connection URI not found in .env file'
  );
  console.log(
    'Please add either MONGOCONNECTION or MONGODB_URI to your .env file'
  );
  process.exit(1); // Exit if no MongoDB URI
}

// ======================
// Database Connection
// ======================
mongoose.set('strictQuery', true); // Prepare for Mongoose 7

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Exit on DB connection failure
  });

// ======================
// Middleware
// ======================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ======================
// Routes
// ======================
const routes = [
  require('./routes/LoginRegisterRoute'),
  require('./routes/DashboardRoute'),
  require('./routes/UserRoute'),
  require('./routes/PatientRoute'),
  require('./routes/DoctorRoute'),
  require('./routes/AppointmentRoute'),
  require('./routes/MedicineRoute'),
  require('./routes/PrescriptionRoute'),
  require('./routes/InvoiceRoute'),
  require('./routes/ProfileRoute'),
  require('./routes/api/paypal'),
];
app.use(require('./routes/VideoCallRoute'));

routes.forEach((route) => app.use(route));

// ======================
// Basic Routes
// ======================
app.get('/', (req, res) => {
  res.send('🏥 Hospital Management System API');
});

// ======================
// Error Handling Middleware
// ======================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// === SOCKET.IO EVENTS ===
io.on('connection', (socket) => {
  console.log('📡 New client connected:', socket.id);

  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userName });

    socket.on('signal', (data) => {
      socket.to(data.target).emit('signal', {
        callerId: socket.id,
        signal: data.signal,
      });
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-left', { socketId: socket.id });
    });
  });
});

app.use(
  '/video-call',
  express.static(path.join(__dirname, '../client/public'))
);

// ======================
// Server Start
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 MongoDB URI: ${MONGODB_URI}`);
});
