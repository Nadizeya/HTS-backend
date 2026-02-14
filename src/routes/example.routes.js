const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// Example: Get all items
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("your_table_name").select("*");

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Example: Get single item by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("your_table_name")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Example: Create new item
router.post("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("your_table_name")
      .insert([req.body])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Example: Update item
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("your_table_name")
      .update(req.body)
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Example: Delete item
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("your_table_name")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
