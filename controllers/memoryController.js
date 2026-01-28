const Memory = require("../models/Memory");
const cloudinary = require("../config/cloudinary");
/**
 * Add a new memory
 * Only caregivers can add memories for their linked patient
 */
exports.addMemory = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Please log in" 
      });
    }

    if (req.session.user.role !== "caregiver") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only caregivers can add memories" 
      });
    }

    if (!req.session.user.patientId) {
      return res.status(400).json({ 
        error: "Not linked",
        message: "You must be linked to a patient first" 
      });
    }

    const { title, description, relation, notes, imageUrl, imagePublicId, audioUrl, audioPublicId } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ 
        error: "Validation error",
        message: "Memory title is required" 
      });
    }

    const memory = await Memory.create({
      caregiverId: req.session.user.id,
      patientId: req.session.user.patientId,
      title: title.trim(),
      description: description ? description.trim() : "",
      relation: relation ? relation.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      imageUrl,
      imagePublicId,
      audioUrl,
      audioPublicId
    });

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
    const { title, description, relation, notes, imageUrl, imagePublicId, audioUrl, audioPublicId } = req.body;

    if (!req.session.user || req.session.user.role !== "caregiver") {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Only caregivers can update memories" 
      });
    }

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

    // Delete old media from Cloudinary if new media uploaded
    if (imageUrl && memory.imagePublicId && imagePublicId !== memory.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(memory.imagePublicId);
      } catch (err) {
        console.error("Failed to delete old image:", err);
      }
    }

    if (audioUrl && memory.audioPublicId && audioPublicId !== memory.audioPublicId) {
      try {
        await cloudinary.uploader.destroy(memory.audioPublicId, { resource_type: 'video' });
      } catch (err) {
        console.error("Failed to delete old audio:", err);
      }
    }

    // Update fields
    if (title !== undefined) memory.title = title.trim();
    if (description !== undefined) memory.description = description.trim();
    if (relation !== undefined) memory.relation = relation.trim();
    if (notes !== undefined) memory.notes = notes.trim();
    if (imageUrl !== undefined) {
      memory.imageUrl = imageUrl;
      memory.imagePublicId = imagePublicId;
    }
    if (audioUrl !== undefined) {
      memory.audioUrl = audioUrl;
      memory.audioPublicId = audioPublicId;
    }

    await memory.save();

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

    if (!req.session.user || req.session.user.role !== "caregiver") {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Only caregivers can delete memories" 
      });
    }

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

    // Delete files from Cloudinary
    try {
      if (memory.imagePublicId) {
        await cloudinary.uploader.destroy(memory.imagePublicId);
      }
      if (memory.audioPublicId) {
        await cloudinary.uploader.destroy(memory.audioPublicId, { resource_type: 'video' });
      }
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
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