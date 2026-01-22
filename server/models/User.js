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
