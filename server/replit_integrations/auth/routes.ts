import type { Express } from "express";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user (public endpoint - returns null if not authenticated)
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.json(null);
      }
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
