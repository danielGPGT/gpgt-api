const express = require("express");
const { readSheet, writeToSheet } = require("../services/sheetsService");
const { checkSheetAccess } = require('../middleware/apiKeyAuth');
const router = express.Router();

// GET route to fetch seen notifications for a specific user
router.get("/seen", checkSheetAccess(), async (req, res, next) => {
  try {
    const data = await readSheet('notifications');
    if (!data) {
      return res.status(200).json([]);
    }
    // Filter notifications by user_id from JWT
    const userNotifications = data.filter(item => item.user_id === req.user.user_id);
    res.status(200).json(userNotifications.map(item => item.booking_id));
  } catch (error) {
    next(error);
  }
});

// POST route to mark notifications as seen for a specific user
router.post("/seen", checkSheetAccess(), async (req, res, next) => {
  const { bookingIds } = req.body;
  
  // Ensure we have a valid user ID from the JWT token
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ 
      error: "User ID not found in token",
      requiresReauth: true
    });
  }

  const userId = req.user.user_id;
  
  if (!Array.isArray(bookingIds)) {
    return res.status(400).json({ error: "bookingIds must be an array" });
  }

  try {
    // Get existing seen notifications
    const existingData = await readSheet('notifications') || [];
    
    // Create a map of existing notifications for this user
    const existingUserNotifications = new Map(
      existingData
        .filter(item => item.user_id === userId)
        .map(item => [item.booking_id, item])
    );
    
    // Filter out already seen IDs for this user
    const newIds = bookingIds.filter(id => !existingUserNotifications.has(id));
    
    if (newIds.length > 0) {
      // Get the current timestamp
      const timestamp = new Date().toISOString();
      
      // Prepare all new rows at once with correct column order
      const newRows = newIds.map(id => [
        id,                    // booking_id
        timestamp,            // seen
        userId                // user_id
      ]);

      // Write all rows in a single batch
      await writeToSheet('notifications', newRows);
    }

    res.status(200).json({ 
      message: "Notifications marked as seen",
      count: newIds.length,
      total: bookingIds.length,
      userId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 