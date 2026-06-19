// app.js
// CodeCraftHub - Simple REST API for managing courses
// - CRUD operations on /api/courses
// - Data stored in a JSON file: data/courses.json (auto-created if missing)
// - Each course: id, name, description, target_date (YYYY-MM-DD), status, created_at
// - Status must be one of: "Not Started", "In Progress", "Completed"
// - Basic error handling and beginner-friendly comments
// - Server runs on port 5000

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

// Create Express app
const app = express();

// --------- Configuration ---------
const PORT = 5000;
const dataDir = path.resolve(__dirname, 'data');
const dataFile = path.resolve(dataDir, 'courses.json');
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed'];

// --------- Helper: ensure data file exists ---------
async function ensureDataFile() {
  // Create the data directory if it doesn't exist
  await fs.mkdir(dataDir, { recursive: true });

  // Create the courses.json file if it doesn't exist
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, '[]', 'utf8');
  }
}

// --------- Helper: load courses from JSON file ---------
async function loadCourses() {
  await ensureDataFile();
  try {
    const content = await fs.readFile(dataFile, 'utf8');
    // If file is empty or invalid JSON, fall back to []
    if (!content) return [];
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading courses.json:', err);
    return [];
  }
}

// --------- Helper: save courses to JSON file ---------
async function saveCourses(courses) {
  await ensureDataFile();
  try {
    await fs.writeFile(dataFile, JSON.stringify(courses, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to courses.json:', err);
    throw err;
  }
}

// --------- Helper: generate next ID ---------
function getNextId(courses) {
  const maxId = courses.reduce((m, c) => (c.id > m ? c.id : m), 0);
  return maxId + 1;
}

// --------- Middleware ---------
app.use(cors());            // Enable CORS for all origins (frontend-friendly)
app.use(express.json());     // Parse JSON request bodies

// --------- Routes: CRUD for /api/courses ---------

// GET /api/courses - Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await loadCourses();
    res.json({ success: true, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load courses' });
  }
});

// GET /api/courses/stats - Get basic statistics about courses
app.get('/api/courses/stats', async (req, res) => {
  try {
    const courses = await loadCourses();
    const total = courses.length;

    // Initialize counters for all allowed statuses
    const byStatus = {};
    STATUS_OPTIONS.forEach((s) => (byStatus[s] = 0));

    // Count by status
    for (const c of courses) {
      const st = c.status;
      if (STATUS_OPTIONS.includes(st)) {
        byStatus[st] = (byStatus[st] ?? 0) + 1;
      }
    }

    res.json({ success: true, data: { total, by_status: byStatus } });
  } catch (err) {
    console.error('Error computing stats:', err);
    res.status(500).json({ success: false, error: 'Failed to compute statistics' });
  }
});

// GET /api/courses/:id - Get a specific course
app.get('/api/courses/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid course id' });
  }

  try {
    const courses = await loadCourses();
    const course = courses.find(c => c.id === id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load course' });
  }
});

// POST /api/courses - Add a new course
app.post('/api/courses', async (req, res) => {
  const { name, description, target_date, status } = req.body;

  // Validation: all fields are required
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Missing or invalid "name"' });
  }
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return res.status(400).json({ success: false, error: 'Missing or invalid "description"' });
  }
  if (!target_date || typeof target_date !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing or invalid "target_date"' });
  }
  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(target_date)) {
    return res.status(400).json({ success: false, error: 'Invalid "target_date" format. Use YYYY-MM-DD' });
  }
  // Validate actual date (e.g., 2026-02-30 would be invalid)
  const parsedDate = new Date(target_date);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ success: false, error: 'Invalid "target_date" value' });
  }

  if (!status || !STATUS_OPTIONS.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid "status". Must be one of: ${STATUS_OPTIONS.join(', ')}` });
  }

  try {
    const courses = await loadCourses();
    const newCourse = {
      id: getNextId(courses),
      name: name.trim(),
      description: description.trim(),
      target_date: target_date,
      status,
      created_at: new Date().toISOString()
    };

    const updated = [...courses, newCourse];
    await saveCourses(updated);
    res.status(201).json({ success: true, data: newCourse });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create course' });
  }
});

// PUT /api/courses/:id - Update a course (partial updates allowed)
app.put('/api/courses/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid course id' });
  }

  const updates = req.body || {};

  // If nothing provided to update, reject
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'No update fields provided' });
  }

  // Validate provided fields
  if (updates.name !== undefined) {
    if (!updates.name || typeof updates.name !== 'string' || updates.name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Invalid "name"' });
    }
  }
  if (updates.description !== undefined) {
    if (typeof updates.description !== 'string' || updates.description.trim() === '') {
      return res.status(400).json({ success: false, error: 'Invalid "description"' });
    }
  }
  if (updates.target_date !== undefined) {
    if (typeof updates.target_date !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid "target_date"' });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(updates.target_date)) {
      return res.status(400).json({ success: false, error: 'Invalid "target_date" format. Use YYYY-MM-DD' });
    }
    const parsedDate = new Date(updates.target_date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid "target_date" value' });
    }
  }
  if (updates.status !== undefined) {
    if (!STATUS_OPTIONS.includes(updates.status)) {
      return res.status(400).json({ success: false, error: `Invalid "status". Must be one of: ${STATUS_OPTIONS.join(', ')}` });
    }
  }

  try {
    const courses = await loadCourses();
    const idx = courses.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const existing = courses[idx];
    const updated = {
      ...existing,
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.target_date !== undefined ? { target_date: updates.target_date } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {})
      // created_at remains unchanged to preserve original creation time
    };

    courses[idx] = updated;
    await saveCourses(courses);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:id - Delete a course
app.delete('/api/courses/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid course id' });
  }

  try {
    const courses = await loadCourses();
    const idx = courses.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const [removed] = courses.splice(idx, 1);
    await saveCourses(courses);
    res.json({ success: true, data: removed });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
});


// --------- Start server ---------
app.listen(PORT, () => {
  console.log(`CodeCraftHub API is running on http://localhost:${PORT}`);
});