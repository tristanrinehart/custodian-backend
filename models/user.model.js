// 3100
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: true,
    //select: false
  },
  username: {
    type: String,
    required: false,
    unique: true,
    maxlength: 32,
    default: function() {return this.email;},
    trim: true
  },
  firstName: {
    type: String,
    maxlength: 32,
    trim: true
  },
  lastName: {
    type: String,
    maxlength: 32,
    trim: true
  },
  refreshToken: {
    type: String,
    required: false,
    //select: false // Do not return this field by default
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
