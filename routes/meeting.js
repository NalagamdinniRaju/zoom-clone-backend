// routes/meeting.js

const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Create a new meeting
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, startTime, endTime } = req.body;
    const host = req.user.id;
    const room = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const meeting = new Meeting({
      title,
      description,
      host,
      startTime,
      endTime,
      room
    });

    await meeting.save();
    res.status(201).json(meeting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all meetings (admin only)
router.get('/', auth, admin, async (req, res) => {
  try {
    const meetings = await Meeting.find().populate('host', 'username');
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get meetings for the logged-in user
router.get('/my-meetings', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({ host: req.user.id });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific meeting
router.get('/:id', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('host', 'username');
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a meeting
router.patch('/:id', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if the user is the host of the meeting
    if (meeting.host.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this meeting' });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'description', 'startTime', 'endTime'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    updates.forEach(update => meeting[update] = req.body[update]);
    await meeting.save();

    res.json(meeting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a meeting
router.delete('/:id', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if the user is the host of the meeting or an admin
    if (meeting.host.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this meeting' });
    }

    await meeting.remove();
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join a meeting
router.post('/:id/join', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.participants.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have already joined this meeting' });
    }

    meeting.participants.push(req.user.id);
    await meeting.save();

    res.json({ message: 'Joined meeting successfully', room: meeting.room });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave a meeting
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const participantIndex = meeting.participants.indexOf(req.user.id);
    if (participantIndex === -1) {
      return res.status(400).json({ message: 'You are not a participant in this meeting' });
    }

    meeting.participants.splice(participantIndex, 1);
    await meeting.save();

    res.json({ message: 'Left meeting successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;