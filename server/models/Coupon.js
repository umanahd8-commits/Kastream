const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true
        },
        planId: {
            type: String,
            required: true
        },
        planName: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        used: {
            type: Boolean,
            default: false
        },
        usedBy: {
            type: String,
            default: null
        },
        usedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

CouponSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
    }
});

module.exports = mongoose.model('Coupon', CouponSchema);

