const mongoose = require('mongoose');

const accountSchema = mongoose.Schema({
  username: String,
  password: String
});

module.exports = mongoose.model('account', accountSchema);
