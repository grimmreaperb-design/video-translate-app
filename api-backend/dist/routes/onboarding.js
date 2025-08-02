"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// In-memory storage (in production, use a database)
const users = new Map();
// Create a new user
router.post("/users", (req, res) => {
    const { name, language } = req.body;
    if (!name || !language) {
        return res.status(400).json({ error: "Name and language are required" });
    }
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
        id: userId,
        name,
        language,
    };
    users.set(userId, user);
    res.json({ user, message: "User created successfully" });
});
// Get user by ID
router.get("/users/:userId", (req, res) => {
    const { userId } = req.params;
    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
});
// Update user
router.put("/users/:userId", (req, res) => {
    const { userId } = req.params;
    const { name, language } = req.body;
    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    if (name)
        user.name = name;
    if (language)
        user.language = language;
    res.json({ user, message: "User updated successfully" });
});
// Delete user
router.delete("/users/:userId", (req, res) => {
    const { userId } = req.params;
    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    users.delete(userId);
    res.json({ message: "User deleted successfully" });
});
// Get all users
router.get("/users", (req, res) => {
    const userList = Array.from(users.values()).map(user => ({
        id: user.id,
        name: user.name,
        language: user.language,
        roomId: user.roomId,
    }));
    res.json({ users: userList });
});
// Language preferences endpoint
router.get("/languages", (req, res) => {
    const languages = [
        { code: "en", name: "English" },
        { code: "es", name: "Spanish" },
        { code: "pt", name: "Portuguese" },
        { code: "fr", name: "French" },
        { code: "de", name: "German" },
        { code: "it", name: "Italian" },
        { code: "ja", name: "Japanese" },
        { code: "ko", name: "Korean" },
        { code: "zh", name: "Chinese" },
        { code: "ru", name: "Russian" },
        { code: "ar", name: "Arabic" },
        { code: "hi", name: "Hindi" },
    ];
    res.json({ languages });
});
// User onboarding completion
router.post("/users/:userId/complete", (req, res) => {
    const { userId } = req.params;
    const { preferences } = req.body;
    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    // In a real app, you might store additional onboarding preferences
    // For now, we'll just return success
    res.json({
        user,
        message: "Onboarding completed successfully",
        preferences
    });
});
exports.default = router;
//# sourceMappingURL=onboarding.js.map