const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    referrer: {
        type: String,
        default: 'admin'
    },
    country: {
        type: String,
        default: 'NG'
    },
    couponCode: {
        type: String
    },
    packageType: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    taskBalance: {
        type: Number,
        default: 0
    },
    availableTasks: {
        type: Number,
        default: 0
    },
    dailyEarnings: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Transform _id to id when converting to JSON
UserSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
    }
});

module.exports = mongoose.model('User', UserSchema);
