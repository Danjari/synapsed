 // User Schema - Extended from Auth.js User model
// We'll extend the Auth.js User model with our custom fields
const UserSchema = new mongoose.Schema({
    // Auth.js will handle these fields: name, email, emailVerified, image
    
    // Custom fields for our application
    role: {
      type: String,
      enum: ['professor', 'student'],
      required: true,
      default: 'student',
    },
    // Classes the user belongs to
    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
    // For students only - track progress and notifications
    progress: {
      type: Map,
      of: {
        pathwayId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LearningPathway',
        },
        completedModules: [String],
        assessmentScores: [
          {
            assessmentId: String,
            score: Number,
            completedAt: Date,
          },
        ],
        lastAccessed: Date,
      },
      default: {},
    },
    notificationPreferences: {
      assignments: {
        type: Boolean,
        default: true,
      },
      feedback: {
        type: Boolean,
        default: true,
      },
      deadlines: {
        type: Boolean,
        default: true,
      },
      announcements: {
        type: Boolean,
        default: true,
      },
    },
  });
  
  // Class Schema
  const ClassSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    invitations: [
      {
        email: String,
        token: String,
        expires: Date,
      },
    ],
    learningPathways: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningPathway',
      },
    ],
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  });
  
  // Document Schema
  const DocumentSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    originalFilename: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processed', 'error'],
      default: 'uploaded',
    },
    content: {
      raw: String, // Original content
      processed: String, // OCR processed content
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  });
  
  // Learning Pathway Schema
  const LearningPathwaySchema = new mongoose.Schema({
    title: {
      type: String,
      required: true,
    },
    description: String,
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Professor or AI System
      required: true,
    },
    modules: [
      {
        title: String,
        description: String,
        content: String,
        contentType: {
          type: String,
          enum: ['text', 'video', 'quiz', 'assignment'],
          default: 'text',
        },
        order: Number,
        assessments: [
          {
            type: {
              type: String,
              enum: ['quiz', 'assignment', 'survey'],
            },
            questions: [
              {
                question: String,
                options: [String],
                correctAnswer: String, // For quizzes
                points: Number,
              },
            ],
          },
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  });
  
  // Notification Schema
  const NotificationSchema = new mongoose.Schema({
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['assignment', 'feedback', 'deadline', 'announcement', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedTo: {
      model: {
        type: String,
        enum: ['Class', 'LearningPathway', 'Document'],
      },
      id: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });
  
  // Define models - Auth.js will handle Account, Session, and VerificationToken models
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const Class = mongoose.models.Class || mongoose.model('Class', ClassSchema);
  const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
  const LearningPathway = mongoose.models.LearningPathway || mongoose.model('LearningPathway', LearningPathwaySchema);
  const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
  
  module.exports = {
    User,
    Class,
    Document,
    LearningPathway,
    Notification,
  };