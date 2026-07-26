const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    splitType: {
      type: String,
      enum: ['equal', 'unequal', 'percentage'],
      default: 'equal',
    },
    splits: {
      type: [splitSchema],
      validate: {
        validator: function (splits) {
          return splits.length > 0;
        },
        message: 'Expense must have at least one split entry',
      },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Sanity check: splits should sum to the total amount (within a cent of rounding error)
expenseSchema.pre('validate', function (next) {
  if (this.splits && this.splits.length) {
    const total = this.splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(total - this.amount) > 0.5) {
      return next(new Error('Sum of splits must equal the total expense amount'));
    }
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
