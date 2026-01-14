const Memory = require("../models/Memory");

/**
 * Add a new memory
 * Only caregivers can add memories for their linked patient
 */
exports.addMemory = async (req, res) => {
  try {
    console.log("SESSION USER:", req.session.user);

    // Validate session
    if (!req.session.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Please log in" 
      });
    }

    // Only caregivers can add memories
    if (req.session.user.role !== "caregiver") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only caregivers can add memories" 
      });
    }

    // Check if caregiver is linked to a patient
    if (!req.session.user.patientId) {
      return res.status(400).json({ 
        error: "Not linked",
        message: "You must be linked to a patient first" 
      });
    }

    // Accept text fields and files (multer handles files)
    const { title, description, relation, notes, category, tags } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ 
        error: "Validation error",
        message: "Memory title is required" 
      });
    }

    // Handle uploaded files (if any)
    let imagePath = req.body.imageUrl || undefined;
    let audioPath = req.body.audioUrl || undefined;

    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        imagePath = `/uploads/memories/images/${req.files.image[0].filename}`;
      }
      if (req.files.audio && req.files.audio[0]) {
        audioPath = `/uploads/memories/audio/${req.files.audio[0].filename}`;
      }
    }

    // Normalize tags
    let tagArray = [];
    if (tags) {
      if (Array.isArray(tags)) tagArray = tags;
      else if (typeof tags === 'string') tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Create memory
    const memory = await Memory.create({
      caregiverId: req.session.user.id,
      patientId: req.session.user.patientId,
      title: title.trim(),
      description: description ? description.trim() : "",
      relation: relation ? relation.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      category: category ? category.trim() : undefined,
      imageUrl: imagePath,
      audioUrl: audioPath,
      tags: tagArray
    });

    // Populate references for response
    await memory.populate([
      { path: "caregiverId", select: "name email" },
      { path: "patientId", select: "name" }
    ]);

    res.status(201).json({
      success: true,
      memory
    });

  } catch (err) {
    console.error("Add memory error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to add memory" 
    });
  }
};


// Update getMemories to support query filters
exports.getMemories = async (req, res) => {
  try {
    // Validate session
    if (!req.session.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Please log in" 
      });
    }

    const { role, id, patientId } = req.session.user;
    const { category, search } = req.query;
    let memories;

    const buildFilter = (base) => {
      const filter = { ...base };
      if (category && category !== 'All') filter.category = category;
      if (search) {
        const q = new RegExp(search.trim(), 'i');
        filter.$or = [
          { title: q },
          { description: q },
          { notes: q },
          { relation: q }
        ];
      }
      return filter;
    };

    if (role === "caregiver") {
      // Caregiver sees memories they created for their patient
      if (!patientId) {
        return res.json({ memories: [] }); // Not linked yet
      }
      const filter = buildFilter({ caregiverId: id, patientId });
      memories = await Memory.find(filter)
        .populate("patientId", "name")
        .sort({ createdAt: -1 });

    } else if (role === "patient") {
      // Patient sees all memories created for them
      const filter = buildFilter({ patientId: id });
      memories = await Memory.find(filter)
        .populate("caregiverId", "name email")
        .sort({ createdAt: -1 });

    } else {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Invalid user role" 
      });
    }

    res.json({
      success: true,
      count: memories.length,
      memories
    });

  } catch (err) {
    console.error("Get memories error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to fetch memories" 
    });
  }
};


// Update memory to accept files and new fields
exports.updateMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, relation, notes, category, tags } = req.body;

    // Validate session
    if (!req.session.user || req.session.user.role !== "caregiver") {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Only caregivers can update memories" 
      });
    }

    // Find memory and verify ownership
    const memory = await Memory.findById(id);

    if (!memory) {
      return res.status(404).json({ 
        error: "Not found",
        message: "Memory not found" 
      });
    }

    if (memory.caregiverId.toString() !== req.session.user.id) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You can only update your own memories" 
      });
    }

    // Debug: log incoming update payload
    console.log('Update payload:', { body: req.body, files: Object.keys(req.files || {}) });

    // Handle uploaded files (replace only if provided)
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        memory.imageUrl = `/uploads/memories/images/${req.files.image[0].filename}`;
      }
      if (req.files.audio && req.files.audio[0]) {
        memory.audioUrl = `/uploads/memories/audio/${req.files.audio[0].filename}`;
      }
    }

    // Update fields (update even if empty string provided)
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) memory.title = title ? title.trim() : '';
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) memory.description = description ? description.trim() : '';
    if (Object.prototype.hasOwnProperty.call(req.body, 'relation')) memory.relation = relation ? relation.trim() : '';
    if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) memory.notes = notes ? notes.trim() : '';
    if (Object.prototype.hasOwnProperty.call(req.body, 'category')) memory.category = category ? category.trim() : '';
    if (Object.prototype.hasOwnProperty.call(req.body, 'tags')) {
      if (Array.isArray(tags)) memory.tags = tags;
      else if (typeof tags === 'string') memory.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      else memory.tags = [];
    }

    await memory.save();

    // Populate references to return a consistent object to client
    await memory.populate([
      { path: "caregiverId", select: "name email" },
      { path: "patientId", select: "name" }
    ]);

    res.json({
      success: true,
      memory
    });

  } catch (err) {
    console.error("Update memory error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to update memory" 
    });
  }
};


// Delete a memory
exports.deleteMemory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate session
    if (!req.session.user || req.session.user.role !== "caregiver") {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Only caregivers can delete memories" 
      });
    }

    // Find memory and verify ownership
    const memory = await Memory.findById(id);

    if (!memory) {
      return res.status(404).json({ 
        error: "Not found",
        message: "Memory not found" 
      });
    }

    if (memory.caregiverId.toString() !== req.session.user.id) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You can only delete your own memories" 
      });
    }

    await memory.deleteOne();

    res.json({
      success: true,
      message: "Memory deleted successfully"
    });

  } catch (err) {
    console.error("Delete memory error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to delete memory" 
    });
  }
};

