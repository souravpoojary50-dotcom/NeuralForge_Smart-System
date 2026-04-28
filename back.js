// =================================================================
// 🏛️ GOVFLOW UNIFIED PUBLIC SERVICE WORKFLOW PLATFORM - BACKEND
// COMPLETE PRODUCTION-READY BACKEND IN ONE FILE
// =================================================================

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GovFlowBackend {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, { cors: { origin: "*" } });
    this.init();
  }

  // === MIDDLEWARE ===
  init() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use('/uploads', express.static('uploads'));
    
    this.setupMulter();
    this.setupModels();
    this.setupRoutes();
    this.setupSocket();
    this.setupCron();
    this.connectDB();
  }

  // === FILE UPLOAD ===
  setupMulter() {
    const storage = multer.diskStorage({
      destination: 'uploads/',
      filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`)
    });
    
    this.upload = multer({ 
      storage, 
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
          cb(null, true);
        } else cb(new Error('Only PDF/Images'), false);
      }
    });
  }

  // === MODELS ===
  setupModels() {
    // User Model
    this.userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' },
      department: String,
      phone: String,
      aadhaar: { type: String, unique: true }
    }, { timestamps: true });

    this.userSchema.pre('save', async function(next) {
      if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
      next();
    });

    this.User = mongoose.model('User', this.userSchema);

    // Application Model
    this.applicationSchema = new mongoose.Schema({
      citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      serviceType: { type: String, required: true },
      title: { type: String, required: true },
      description: String,
      documents: [{
        name: String, filePath: String, size: Number,
        verified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }],
      payment: {
        amount: { type: Number, default: 0 },
        upiTransactionId: String,
        status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
      },
      status: {
        type: String,
        enum: ['draft','submitted','under-review','approved','rejected','escalated','completed'],
        default: 'draft'
      },
      currentDepartment: { type: String, required: true },
      assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      history: [{
        status: String, department: String, officer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comments: String, timestamp: { type: Date, default: Date.now }
      }],
      trackingId: { type: String, required: true, unique: true },
      priority: { type: String, enum: ['low','medium','high','urgent'], default: 'medium' }
    }, { timestamps: true });

    this.Application = mongoose.model('Application', this.applicationSchema);
  }

  // === AUTH MIDDLEWARE ===
  authMiddleware(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Access denied' });
      
      const decoded = jwt.verify(token, 'govflow-2024-secret-key');
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  // === ROUTES ===
  setupRoutes() {
    // AUTH
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await this.User.findOne({ email });
        
        if (!user || !await bcrypt.compare(password, user.password)) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
          { id: user._id, role: user.role, department: user.department },
          'govflow-2024-secret-key', { expiresIn: '30d' }
        );
        
        res.json({
          token,
          user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/auth/register', async (req, res) => {
      try {
        const user = new this.User(req.body);
        await user.save();
        res.status(201).json({ message: 'User created', id: user._id });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // APPLICATIONS
    this.app.post('/api/applications', this.authMiddleware, this.upload.array('documents', 10), async (req, res) => {
      try {
        const trackingId = `TRK${Date.now()}${Math.floor(Math.random()*10000)}`;
        
        const app = new this.Application({
          ...req.body,
          citizen: req.user.id,
          trackingId,
          documents: req.files?.map(f => ({
            name: f.originalname, filePath: f.path, size: f.size
          })) || [],
          history: [{ status: 'draft', department: 'Citizen', comments: 'Created' }]
        });
        
        await app.save();
        this.io.to(trackingId).emit('statusUpdate', { trackingId, status: 'draft' });
        res.status(201).json(app);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/applications/my', this.authMiddleware, async (req, res) => {
      try {
        const apps = await this.Application.find(
          req.user.role === 'citizen' ? { citizen: req.user.id } : {}
        ).populate('citizen assignedOfficer', 'name department phone').sort({ updatedAt: -1 });
        res.json(apps);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/applications/track/:trackingId', async (req, res) => {
      try {
        const app = await this.Application.findOne({ trackingId: req.params.trackingId })
          .populate('citizen assignedOfficer history.officer', 'name department phone');
        res.json(app || {});
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/applications/:id/status', this.authMiddleware, async (req, res) => {
      try {
        const app = await this.Application.findById(req.params.id);
        if (!app) return res.status(404).json({ error: 'Not found' });

        const { status, comments } = req.body;
        app.history.push({ 
          status, 
          department: req.user.department || 'System', 
          officer: req.user.id,
          comments 
        });
        app.status = status;
        app.assignedOfficer = req.user.id;
        
        await app.save();
        
        this.io.to(app.trackingId).emit('statusUpdate', {
          trackingId: app.trackingId,
          status,
          officer: req.user.id,
          timestamp: new Date()
        });
        
        res.json(app);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    // DASHBOARD STATS
    this.app.get('/api/dashboard/stats', this.authMiddleware, async (req, res) => {
      try {
        const pipeline = [
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $group: { _id: null, stats: { $push: "$$ROOT" }, total: { $sum: "$count" } } }
        ];
        
        const result = await this.Application.aggregate(pipeline);
        res.json({
          total: result[0]?.total || 0,
          stats: result[0]?.stats || [],
          pending: (result[0]?.stats?.find(s => s._id === 'under-review')?.count || 0)
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // OFFICER DASHBOARD
    this.app.get('/api/applications/officer/:dept', this.authMiddleware, async (req, res) => {
      try {
        const apps = await this.Application.find({
          currentDepartment: req.params.dept,
          status: { $nin: ['approved', 'rejected', 'completed'] }
        }).populate('citizen', 'name phone').sort({ createdAt: -1 });
        res.json(apps);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  // === SOCKET.IO ===
  setupSocket() {
    this.io.on('connection', (socket) => {
      console.log(`👤 Client connected: ${socket.id}`);
      
      socket.on('join-room', (trackingId) => {
        socket.join(trackingId);
        console.log(`📱 ${socket.id} joined: ${trackingId}`);
      });
      
      socket.on('disconnect', () => console.log(`👋 ${socket.id} disconnected`));
    });
  }

  // === AUTOMATION ===
  setupCron() {
    cron.schedule('*/30 * * * *', async () => {
      console.log('🤖 Checking bottlenecks...');
      const oldApps = await this.Application.find({
        status: { $in: ['submitted', 'under-review'] },
        createdAt: { $lt: new Date(Date.now() - 3*24*60*60*1000) }
      });
      
      oldApps.forEach(app => {
        this.io.to(app.trackingId).emit('alert', { 
          message: '⚠️ Processing delayed', 
          trackingId: app.trackingId 
        });
      });
    });
  }

  // === DATABASE ===
  async connectDB() {
    try {
      await mongoose.connect('mongodb://localhost:27017/govflow');
      console.log('✅ MongoDB Connected');
      
      // SEED DEMO DATA
      const count = await this.User.countDocuments();
      if (count === 0) {
        await this.User.insertMany([
          { name: 'Citizen User', email: 'citizen@test.com', password: '123456', phone: '9876543210' },
          { name: 'Officer Priya', email: 'officer@test.com', password: '123456', role: 'officer', department: 'Passport Office' },
          { name: 'Admin', email: 'admin@test.com', password: '123456', role: 'admin' }
        ]);
        console.log('🌱 Demo users created!');
      }
    } catch (error) {
      console.error('❌ MongoDB Error:', error);
    }
  }

  start(port = 5000) {
    this.server.listen(port, () => {
      console.log(`\n🚀 GovFlow Backend: http://localhost:${port}`);
      console.log(`📱 Socket.IO Ready`);
      console.log(`📁 Uploads: http://localhost:${port}/uploads`);
      console.log(`\n👤 Demo Login:`);
      console.log(`   citizen@test.com / 123456`);
      console.log(`   officer@test.com / 123456`);
      console.log(`\n📋 Endpoints:`);
      console.log(`   POST /api/auth/login`);
      console.log(`   POST /api/applications`);
      console.log(`   GET /api/applications/track/TRKxxx`);
    });
  }
}

// 🚀 START SERVER
const backend = new GovFlowBackend();
backend.start(5000);

export default backend;