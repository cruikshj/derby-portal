import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAdmin, authStorage } from "./replit_integrations/auth";
import {
  insertDerbyEventSchema,
  insertDenSchema,
  insertVotingCategorySchema,
  insertRegistrationSchema,
} from "@shared/schema";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (supports Google, GitHub, Apple, email/password)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  // ============ EVENT ROUTES ============
  
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/active", async (req, res) => {
    try {
      const event = await storage.getActiveEvent();
      if (!event) {
        res.json(null);
        return;
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching active event:", error);
      res.status(500).json({ message: "Failed to fetch active event" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEventWithDetails(req.params.id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const parsed = insertDerbyEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid event data", errors: parsed.error.issues });
        return;
      }
      const event = await storage.createEvent(parsed.data);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.updateEvent(req.params.id, req.body);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============ DEN ROUTES ============
  
  app.post("/api/dens", async (req, res) => {
    try {
      const parsed = insertDenSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid den data", errors: parsed.error.issues });
        return;
      }
      const den = await storage.createDen(parsed.data);
      res.status(201).json(den);
    } catch (error) {
      console.error("Error creating den:", error);
      res.status(500).json({ message: "Failed to create den" });
    }
  });

  app.delete("/api/dens/:id", async (req, res) => {
    try {
      await storage.deleteDen(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting den:", error);
      res.status(500).json({ message: "Failed to delete den" });
    }
  });

  // ============ VOTING CATEGORY ROUTES ============
  
  app.post("/api/voting-categories", async (req, res) => {
    try {
      const parsed = insertVotingCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid category data", errors: parsed.error.issues });
        return;
      }
      const category = await storage.createVotingCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.delete("/api/voting-categories/:id", async (req, res) => {
    try {
      await storage.deleteVotingCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // ============ REGISTRATION ROUTES ============
  
  app.get("/api/registrations", async (req, res) => {
    try {
      const eventId = req.query.eventId as string;
      if (!eventId) {
        res.status(400).json({ message: "eventId query parameter required" });
        return;
      }
      const regs = await storage.getRegistrationsByEvent(eventId);
      res.json(regs);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.post(
    "/api/registrations",
    upload.fields([
      { name: "participantPicture", maxCount: 1 },
      { name: "carPicture", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const votingCategoryIds = req.body.votingCategoryIds
          ? JSON.parse(req.body.votingCategoryIds)
          : [];

        const registrationData = {
          eventId: req.body.eventId,
          participantName: req.body.participantName,
          denId: req.body.denId || null,
          carName: req.body.carName,
          participantPictureUrl: files.participantPicture
            ? `/uploads/${files.participantPicture[0].filename}`
            : null,
          carPictureUrl: files.carPicture
            ? `/uploads/${files.carPicture[0].filename}`
            : null,
          votingCategoryIds,
        };

        const parsed = insertRegistrationSchema.safeParse(registrationData);
        if (!parsed.success) {
          res.status(400).json({ message: "Invalid registration data", errors: parsed.error.issues });
          return;
        }

        const registration = await storage.createRegistration(parsed.data);
        res.status(201).json(registration);
      } catch (error) {
        console.error("Error creating registration:", error);
        res.status(500).json({ message: "Failed to create registration" });
      }
    }
  );

  app.patch(
    "/api/registrations/:id",
    upload.fields([
      { name: "participantPicture", maxCount: 1 },
      { name: "carPicture", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const updates: any = {};
        
        if (req.body.participantName) updates.participantName = req.body.participantName;
        if (req.body.denId) updates.denId = req.body.denId;
        if (req.body.carName) updates.carName = req.body.carName;
        if (req.body.votingCategoryIds) {
          updates.votingCategoryIds = JSON.parse(req.body.votingCategoryIds);
        }
        if (files.participantPicture) {
          updates.participantPictureUrl = `/uploads/${files.participantPicture[0].filename}`;
        }
        if (files.carPicture) {
          updates.carPictureUrl = `/uploads/${files.carPicture[0].filename}`;
        }

        const registration = await storage.updateRegistration(req.params.id, updates);
        if (!registration) {
          res.status(404).json({ message: "Registration not found" });
          return;
        }
        res.json(registration);
      } catch (error) {
        console.error("Error updating registration:", error);
        res.status(500).json({ message: "Failed to update registration" });
      }
    }
  );

  app.delete("/api/registrations/:id", async (req, res) => {
    try {
      await storage.deleteRegistration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting registration:", error);
      res.status(500).json({ message: "Failed to delete registration" });
    }
  });

  // ============ BAND.US INTEGRATION ROUTES ============
  // These require Band.us API credentials to function
  
  app.get("/api/band/status", async (req, res) => {
    const clientId = process.env.BAND_CLIENT_ID;
    const clientSecret = process.env.BAND_CLIENT_SECRET;
    res.json({ configured: !!(clientId && clientSecret) });
  });
  
  app.get("/api/band", async (req, res) => {
    try {
      // Check if Band.us is configured
      const clientId = process.env.BAND_CLIENT_ID;
      const clientSecret = process.env.BAND_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        res.json({
          connected: false,
          posts: [],
          events: [],
        });
        return;
      }

      // In a real implementation, this would:
      // 1. Use stored access token to fetch posts and events from Band.us API
      // 2. Cache the results for performance
      
      // For now, return sample structure
      res.json({
        connected: true,
        posts: [],
        events: [],
      });
    } catch (error) {
      console.error("Error fetching Band data:", error);
      res.status(500).json({ message: "Failed to fetch Band data" });
    }
  });

  // ============ ADMIN USER MANAGEMENT ROUTES ============
  
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await authStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/admin", isAdmin, async (req, res) => {
    try {
      const { isAdmin: adminStatus } = req.body;
      if (typeof adminStatus !== "boolean") {
        res.status(400).json({ message: "isAdmin must be a boolean" });
        return;
      }
      
      // Prevent admin from removing their own admin status
      const currentUser = req.user as any;
      if (currentUser.id === req.params.id && !adminStatus) {
        res.status(400).json({ message: "You cannot remove your own admin status" });
        return;
      }
      
      const user = await authStorage.updateUserAdmin(req.params.id, adminStatus);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  return httpServer;
}
