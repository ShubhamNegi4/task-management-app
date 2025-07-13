const mongoose = require('mongoose');
mongoose.connect(`mongodb://127.0.0.1:27017/task_management_app`);

const userSchema = mongoose.Schema({
    Title: String, 
    Description: String,
    Bookmarks: String,
    favorite: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'account' }
})

module.exports = mongoose.model('user', userSchema);