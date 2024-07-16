// const express = require('express');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const auth = require('../middleware/auth');
// const admin = require('../middleware/admin');

// const router = express.Router();
// // server.js
// app.post('/api/users/register', (req, res) => {
//   const { username, email, password } = req.body;

//   // Validate user input
//   if (!username || !email || !password) {
//     return res.status(400).json({ error: 'Invalid input' });
//   }

//   // Hash the password
//   const hashedPassword = bcrypt.hashSync(password, 10);

//   // Create a new user
//   const user = new User({ username, email, password: hashedPassword });

//   // Save the user to the database
//   user.save((err, user) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ error: 'Failed to create user' });
//     }

//     // Return a success response
//     res.json({ message: 'User created successfully' });
//   });
// });

// router.post('/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const user = await User.findOne({ username });
//     if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

//     const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     res.json({ token, username: user.username, isAdmin: user.isAdmin });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// router.get('/profile', auth, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select('-password');
//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Create new user
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
  }
});

// Login route (for completeness)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Ideally, you should generate a JWT token here
    res.json({ token: 'your-jwt-token', username: user.username, isAdmin: user.isAdmin });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
});

// Profile route
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
