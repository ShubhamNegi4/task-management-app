// app.js
const express     = require('express');
const path        = require('path');
const bodyParser  = require('body-parser');
const mongoose    = require('mongoose');
const jwt         = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt      = require('bcryptjs');
const userModel   = require('./models/usermodel');
const accountModel = require('./models/account');

const app = express();
const JWT_SECRET = 'your-secret-key';

// MIDDLEWARE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// AUTH MIDDLEWARE 
function requireLogin(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.redirect('/login');
  }
}

// ROUTES

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  await accountModel.create({
    username: req.body.username,
    password: hashedPassword
  });
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const user = await accountModel.findOne({ username: req.body.username });
  if (!user || !await bcrypt.compare(req.body.password, user.password)) {
    return res.status(401).send('Invalid credentials');
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  res.cookie('token', token, { httpOnly: true });
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Home
app.get('/', requireLogin, async (req, res) => {
  try {
    const notes = await userModel.find({ owner: req.user.id }).lean();
    res.render('index', { notes });
  } catch (err) {
    console.error('Error loading notes:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Create new note
app.post('/create', requireLogin, async (req, res) => {
  try {
    const Title = req.body.title
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');

    await userModel.create({
      Title,
      Description: req.body.details,
      Bookmarks: req.body.url,
      owner: req.user.id
    });

    res.redirect('/');
  } catch (err) {
    console.error('Error saving note:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Show single note
app.get('/file/:title', requireLogin, async (req, res) => {
  try {
    const note = await userModel.findOne({ Title: req.params.title, owner: req.user.id }).lean();
    if (!note) return res.status(404).send('Note not found');
    res.render('show', { note });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Edit form
app.get('/edit/:title', requireLogin, async (req, res) => {
  try {
    const note = await userModel.findOne({ Title: req.params.title, owner: req.user.id }).lean();
    if (!note) return res.status(404).send('Note not found');
    res.render('edit', { note });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Handle edit submission
app.post('/edit', requireLogin, async (req, res) => {
  try {
    const filter = { Title: req.body.previous, owner: req.user.id };

    const updated = {
      Title:       req.body.updated      || req.body.previous,
      Description: req.body.updated_data || req.body.previous_data
    };

    await userModel.findOneAndUpdate(filter, updated);
    res.redirect(`/file/${updated.Title}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Delete note
app.post('/delete', requireLogin, async (req, res) => {
  try {
    await userModel.findOneAndDelete({ Title: req.body.title, owner: req.user.id });
    res.redirect('/');
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Toggle Favorite
app.post('/favorite', requireLogin, async (req, res) => {
  try {
    const note = await userModel.findOne({ Title: req.body.title, owner: req.user.id });
    note.favorite = !note.favorite;
    await note.save();
    res.redirect('/');
  } catch (err) {
    console.error('Error updating favorite:', err);
    res.status(500).send('Internal Server Error');
  }
});
// Logout Session
app.post('/logout', (req, res) => {
  res.clearCookie('token'); 
  res.redirect('/login');
});

// ─── SERVER ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Listening on http://localhost:${PORT}`));
