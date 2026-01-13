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

    // Validate input
    const { title, description, imageUrl, audioUrl, tags } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ 
        error: "Validation error",
        message: "Memory title is required" 
      });
    }

    // Create memory
    const memory = await Memory.create({
      caregiverId: req.session.user.id,
      patientId: req.session.user.patientId,
      title: title.trim(),
      description: description ? description.trim() : "",
      imageUrl,
      audioUrl,
      tags: tags || []
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

/**
 * Get all memories for the logged-in user
 * Caregivers see memories they created
 * Patients see all memories created for them
 */
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
    let memories;

    if (role === "caregiver") {
      // Caregiver sees memories they created for their patient
      if (!patientId) {
        return res.json({ memories: [] }); // Not linked yet
      }
      memories = await Memory.find({ 
        caregiverId: id,
        patientId: patientId 
      })
        .populate("patientId", "name")
        .sort({ createdAt: -1 });

    } else if (role === "patient") {
      // Patient sees all memories created for them
      memories = await Memory.find({ patientId: id })
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

/**
 * Update a memory
 * Only the caregiver who created it can update
 */
exports.updateMemory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, audioUrl, tags } = req.body;

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

    // Update fields
    if (title) memory.title = title.trim();
    if (description !== undefined) memory.description = description.trim();
    if (imageUrl !== undefined) memory.imageUrl = imageUrl;
    if (audioUrl !== undefined) memory.audioUrl = audioUrl;
    if (tags) memory.tags = tags;

    await memory.save();

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

/**
 * Delete a memory
 * Only the caregiver who created it can delete
 */
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