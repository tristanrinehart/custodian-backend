const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    maxlength: 32,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
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
  encrypted_password: {
    type: String,
    required: true,
    select: false
  },
  salt: {
    type: String,
    select: false
  }
}, { timestamps: true });

userSchema
  .virtual("password")
  .set(function (password) {
    this._password = password;
    this.salt = uuidv4();
    this.encrypted_password = this.encryptPassword(password);
  })
  .get(function () {
    return this._password;
  });

userSchema.methods = {
  authenticate: function (plainPassword) {
    return this.encryptPassword(plainPassword) === this.encrypted_password;
  },

  encryptPassword: function (plainPassword) {
    if (!plainPassword || !this.salt) return "";
    try {
      return crypto
        .createHmac("sha256", this.salt)
        .update(plainPassword)
        .digest("hex");
    } catch (err) {
      console.error("Encryption error:", err);
      return "";
    }
  }
};

const User = mongoose.model("User", userSchema);
module.exports = User;