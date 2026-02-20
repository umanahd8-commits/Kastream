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
    referralCode: {
        type: String,
        unique: true
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
    userId: {
        type: String,
        unique: true
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
    gameLastPlayDate: {
        type: String,
        default: null
    },
    gamePlaysToday: {
        type: Number,
        default: 0
    },
    gameTotalEarnedToday: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        default: 'user'
    },
    bankAccounts: [{
        type: {
            type: String,
            enum: ['bank', 'usdt', 'paypal'],
            default: 'bank'
        },
        // Bank Details
        bankName: String,
        accountName: String,
        accountNumber: String,
        
        // USDT Details
        network: {
            type: String,
            enum: ['TRC20', 'TRC-20', 'ERC20', 'BEP20']
        },
        walletAddress: String,
        
        // PayPal Details
        paypalName: String,
        paypalEmail: String
    }],
    tiktokProfileUrl: {
        type: String,
        default: null
    },
    telegramUsername: {
        type: String,
        default: null
    },
    whatsappNumber: {
        type: String,
        default: null
    },
    facebookProfileUrl: {
        type: String,
        default: null
    },
    avatarUrl: {
        type: String,
        default: null
    },
    transactions: [{
        type: {
            type: String,
            enum: ['checkin', 'article', 'withdrawal', 'referral', 'game', 'task'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'NGN'
        },
        direction: {
            type: String,
            enum: ['credit', 'debit'],
            required: true
        },
        source: {
            type: String
        },
        description: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    streakCurrent: {
        type: Number,
        default: 0
    },
    streakLastCheckinDate: {
        type: String,
        default: null
    },
    streakYear: {
        type: Number,
        default: null
    },
    streakMonth: {
        type: Number,
        default: null
    },
    streakDaysThisMonth: {
        type: Number,
        default: 0
    },
    streakTotalEarnedThisMonth: {
        type: Number,
        default: 0
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
