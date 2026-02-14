import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAdmin, isAuthenticated, authStorage } from "./replit_integrations/auth";
import {
  insertDerbyEventSchema,
  insertDenSchema,
  insertVotingCategorySchema,
  insertRegistrationSchema,
  insertRacingAwardSchema,
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

  // ============ PUBLIC CONFIG ============

  app.get("/api/config", (req, res) => {
    const packName = process.env.PACK_NAME || null;
    res.json({ packName });
  });

  // ============ EVENT ROUTES ============
  
  app.get("/api/events", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/active", isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getActiveEventSummary();
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

  app.get("/api/events/active/registrations", isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getActiveEvent();
      if (!event) {
        res.json(null);
        return;
      }

      const adminPreviewRequested = req.query.adminPreview === "true";
      const isUserAdmin = req.user?.isAdmin === true;
      const adminPreviewMode = adminPreviewRequested && isUserAdmin;

      const shouldShowContent = (visibility: string | null | undefined, defaultValue: boolean = false): boolean => {
        if (!visibility || visibility === "hide") return false;
        if (visibility === "show") return true;
        if (visibility === "show_after_voting") {
          if (!event.votingEndDate) return defaultValue;
          const endDate = new Date(event.votingEndDate);
          if (isNaN(endDate.getTime())) return defaultValue;
          const now = new Date();
          return now > endDate;
        }
        return defaultValue;
      };

      const showCarDetails = adminPreviewMode || shouldShowContent(event.carDetailsVisibility, false);
      const showParticipantPhotos = adminPreviewMode || shouldShowContent(event.participantPhotosVisibility, true);

      const filteredRegistrations = event.registrations?.map((reg: any) => ({
        ...reg,
        participantPictureUrl: showParticipantPhotos ? reg.participantPictureUrl : null,
        carName: showCarDetails ? reg.carName : null,
        carPictureUrl: showCarDetails ? reg.carPictureUrl : null,
        votingCategoryIds: showCarDetails ? reg.votingCategoryIds : [],
      }));

      res.json({
        registrations: filteredRegistrations,
        adminPreviewMode,
      });
    } catch (error) {
      console.error("Error fetching active event registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.get("/api/events/active/content", isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getActiveEvent();
      if (!event) {
        res.json(null);
        return;
      }
      res.json({
        id: event.id,
        name: event.name,
        rules: event.rules || "",
        info: event.info || "",
      });
    } catch (error) {
      console.error("Error fetching active event content:", error);
      res.status(500).json({ message: "Failed to fetch event content" });
    }
  });

  app.get("/api/events/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/events", isAuthenticated, async (req, res) => {
    try {
      const { copyFromEventId, ...eventData } = req.body;
      const parsed = insertDerbyEventSchema.safeParse(eventData);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid event data", errors: parsed.error.issues });
        return;
      }
      
      // If copying from another event, get its rules
      let dataToCreate = parsed.data;
      if (copyFromEventId) {
        const sourceEvent = await storage.getEventWithDetails(copyFromEventId);
        if (sourceEvent) {
          dataToCreate = {
            ...parsed.data,
            rules: sourceEvent.rules,
          };
        }
      }
      
      const event = await storage.createEvent(dataToCreate);
      
      // Copy dens and voting categories from source event
      if (copyFromEventId) {
        const sourceEvent = await storage.getEventWithDetails(copyFromEventId);
        if (sourceEvent) {
          // Copy dens
          for (const den of sourceEvent.dens) {
            await storage.createDen({
              eventId: event.id,
              name: den.name,
              sortOrder: den.sortOrder,
            });
          }
          // Copy voting categories
          for (const category of sourceEvent.votingCategories) {
            await storage.createVotingCategory({
              eventId: event.id,
              name: category.name,
              description: category.description,
              sortOrder: category.sortOrder,
            });
          }
          // Copy racing awards (without results)
          const sourceAwards = await storage.getRacingAwardsByEvent(copyFromEventId);
          for (const award of sourceAwards) {
            await storage.createRacingAward({
              eventId: event.id,
              name: award.name,
              description: award.description,
              sortOrder: award.sortOrder,
            });
          }
        }
      }
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/events/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============ DEN ROUTES ============
  
  app.post("/api/dens", isAuthenticated, async (req, res) => {
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

  app.delete("/api/dens/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDen(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting den:", error);
      res.status(500).json({ message: "Failed to delete den" });
    }
  });

  // ============ VOTING CATEGORY ROUTES ============
  
  app.post("/api/voting-categories", isAuthenticated, async (req, res) => {
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

  app.delete("/api/voting-categories/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteVotingCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // ============ REGISTRATION ROUTES ============
  
  app.get("/api/registrations", isAuthenticated, async (req, res) => {
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

  // Get registrations for the current logged-in user
  app.get("/api/registrations/my", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }
      const eventId = req.query.eventId as string;
      if (!eventId) {
        res.status(400).json({ message: "eventId query parameter required" });
        return;
      }
      const regs = await storage.getRegistrationsByUser(req.user.id, eventId);
      res.json(regs);
    } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Get a single registration by ID (requires auth and ownership check)
  app.get("/api/registrations/:id", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const registration = await storage.getRegistrationWithDen(req.params.id);
      if (!registration) {
        res.status(404).json({ message: "Registration not found" });
        return;
      }

      // Check ownership - only owner or admin can view
      if (registration.userId !== req.user.id && !req.user.isAdmin) {
        res.status(403).json({ message: "You can only view your own registrations" });
        return;
      }

      res.json(registration);
    } catch (error) {
      console.error("Error fetching registration:", error);
      res.status(500).json({ message: "Failed to fetch registration" });
    }
  });

  app.post(
    "/api/registrations",
    upload.fields([
      { name: "participantPicture", maxCount: 1 },
      { name: "carPicture", maxCount: 1 },
    ]),
    async (req: any, res) => {
      try {
        if (!req.isAuthenticated() || !req.user) {
          res.status(401).json({ message: "Authentication required" });
          return;
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const votingCategoryIds = req.body.votingCategoryIds
          ? JSON.parse(req.body.votingCategoryIds)
          : [];

        const registrationData = {
          eventId: req.body.eventId,
          userId: req.user.id,
          participantName: req.body.participantName,
          denId: req.body.denId || null,
          carName: req.body.carName || null,
          participantPictureUrl: files.participantPicture
            ? `/uploads/${files.participantPicture[0].filename}`
            : null,
          carPictureUrl: files.carPicture
            ? `/uploads/${files.carPicture[0].filename}`
            : null,
          votingCategoryIds,
          notes: req.body.notes || null,
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
    async (req: any, res) => {
      try {
        if (!req.isAuthenticated() || !req.user) {
          res.status(401).json({ message: "Authentication required" });
          return;
        }

        // Check ownership
        const existing = await storage.getRegistration(req.params.id);
        if (!existing) {
          res.status(404).json({ message: "Registration not found" });
          return;
        }
        if (existing.userId !== req.user.id && !req.user.isAdmin) {
          res.status(403).json({ message: "You can only edit your own registrations" });
          return;
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const updates: any = {};
        
        if (req.body.participantName) updates.participantName = req.body.participantName;
        if (req.body.denId) updates.denId = req.body.denId;
        if (req.body.carName !== undefined) updates.carName = req.body.carName || null;
        if (req.body.votingCategoryIds) {
          updates.votingCategoryIds = JSON.parse(req.body.votingCategoryIds);
        }
        if (req.body.notes !== undefined) {
          updates.notes = req.body.notes || null;
        }
        if (req.body.accepted !== undefined) {
          updates.accepted = req.body.accepted === "true" || req.body.accepted === true;
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

  app.patch("/api/registrations/:id/accepted", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }
      if (!req.user.isAdmin) {
        res.status(403).json({ message: "Admin access required" });
        return;
      }
      const { accepted } = req.body;
      if (typeof accepted !== "boolean") {
        res.status(400).json({ message: "accepted must be a boolean" });
        return;
      }
      const registration = await storage.updateRegistration(req.params.id, { accepted });
      if (!registration) {
        res.status(404).json({ message: "Registration not found" });
        return;
      }
      res.json(registration);
    } catch (error) {
      console.error("Error updating registration accepted status:", error);
      res.status(500).json({ message: "Failed to update registration" });
    }
  });

  app.delete("/api/registrations/:id", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      // Check ownership
      const existing = await storage.getRegistration(req.params.id);
      if (!existing) {
        res.status(404).json({ message: "Registration not found" });
        return;
      }
      if (existing.userId !== req.user.id && !req.user.isAdmin) {
        res.status(403).json({ message: "You can only delete your own registrations" });
        return;
      }

      await storage.deleteRegistration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting registration:", error);
      res.status(500).json({ message: "Failed to delete registration" });
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

  app.patch("/api/admin/users/:id/access-status", isAdmin, async (req, res) => {
    try {
      const { accessStatus } = req.body;
      const validStatuses = ["pending", "active", "disabled"];
      if (!validStatuses.includes(accessStatus)) {
        res.status(400).json({ message: "accessStatus must be 'pending', 'active', or 'disabled'" });
        return;
      }
      
      // Prevent admin from changing their own access status
      const currentUser = req.user as any;
      if (currentUser.id === req.params.id) {
        res.status(400).json({ message: "You cannot change your own access status" });
        return;
      }
      
      const user = await authStorage.updateUserAccessStatus(req.params.id, accessStatus);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user access status:", error);
      res.status(500).json({ message: "Failed to update user access status" });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      // Prevent admin from deleting themselves
      const currentUser = req.user as any;
      if (currentUser.id === req.params.id) {
        res.status(400).json({ message: "You cannot delete your own account" });
        return;
      }
      
      // Check if target user is an admin
      const targetUser = await authStorage.getUser(req.params.id);
      if (!targetUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      
      // If deleting an admin, ensure at least one other admin remains
      if (targetUser.isAdmin) {
        const allUsers = await authStorage.getAllUsers();
        const otherAdminCount = allUsers.filter(u => u.isAdmin && u.id !== req.params.id).length;
        if (otherAdminCount < 1) {
          res.status(400).json({ message: "Cannot delete the last admin user" });
          return;
        }
      }
      
      await authStorage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      // Handle foreign key constraint violations (PostgreSQL: 23503, SQLite: SQLITE_CONSTRAINT)
      if (error.code === '23503' || error.code === 'SQLITE_CONSTRAINT' || 
          error.message?.includes('FOREIGN KEY constraint') ||
          error.message?.includes('foreign key')) {
        res.status(400).json({ message: "Cannot delete user with associated data. Remove their registrations first." });
        return;
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ============ INVITE LINK ROUTES ============

  app.get("/api/admin/invite-link", isAdmin, async (req, res) => {
    try {
      const link = await authStorage.getInviteLink();
      res.json(link);
    } catch (error) {
      console.error("Error fetching invite link:", error);
      res.status(500).json({ message: "Failed to fetch invite link" });
    }
  });

  app.post("/api/admin/invite-link", isAdmin, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const link = await authStorage.createInviteLink(currentUser.id);
      res.json(link);
    } catch (error) {
      console.error("Error creating invite link:", error);
      res.status(500).json({ message: "Failed to create invite link" });
    }
  });

  app.delete("/api/admin/invite-link", isAdmin, async (req, res) => {
    try {
      await authStorage.deleteInviteLink();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invite link:", error);
      res.status(500).json({ message: "Failed to delete invite link" });
    }
  });

  // ============ VOTING ROUTES ============

  // Get vote for an event (public for voting, includes entries)
  app.get("/api/events/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const eventVote = await storage.getEventVoteByEvent(eventId);
      if (!eventVote) {
        res.json(null);
        return;
      }
      const voteWithDetails = await storage.getEventVoteWithDetails(eventVote.id);
      if (voteWithDetails && !req.user?.isAdmin) {
        voteWithDetails.categoryEntries = voteWithDetails.categoryEntries.map((entry: any) => ({
          ...entry,
          registration: entry.registration ? {
            id: entry.registration.id,
            carName: entry.registration.carName,
            carPictureUrl: entry.registration.carPictureUrl,
          } : undefined,
        }));
      }
      res.json(voteWithDetails);
    } catch (error) {
      console.error("Error fetching event vote:", error);
      res.status(500).json({ message: "Failed to fetch vote" });
    }
  });

  // Create a vote for an event (admin only) - prefills from registration votingCategoryIds
  app.post("/api/events/:id/vote", isAdmin, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const event = await storage.getEventWithDetails(eventId);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      // Check if vote already exists
      const existing = await storage.getEventVoteByEvent(eventId);
      if (existing) {
        res.status(400).json({ message: "A vote already exists for this event" });
        return;
      }

      const vote = await storage.createEventVote({
        eventId,
        status: "draft",
        createdById: req.user.id,
      });

      // Prefill category entries from registrations' votingCategoryIds
      for (const reg of event.registrations) {
        if (reg.votingCategoryIds && reg.votingCategoryIds.length > 0 && reg.carName) {
          for (const catId of reg.votingCategoryIds) {
            const categoryExists = event.votingCategories.some((c) => c.id === catId);
            if (categoryExists) {
              await storage.addVoteCategoryEntry({
                eventVoteId: vote.id,
                votingCategoryId: catId,
                registrationId: reg.id,
              });
            }
          }
        }
      }

      const voteWithDetails = await storage.getEventVoteWithDetails(vote.id);
      res.status(201).json(voteWithDetails);
    } catch (error) {
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Update vote status (admin only)
  app.patch("/api/vote/:voteId/status", isAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["draft", "open", "closed", "published"];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
      }

      const publishedAt = status === "published" ? new Date() : undefined;
      const vote = await storage.updateEventVoteStatus(req.params.voteId, status, publishedAt);
      if (!vote) {
        res.status(404).json({ message: "Vote not found" });
        return;
      }
      res.json(vote);
    } catch (error) {
      console.error("Error updating vote status:", error);
      res.status(500).json({ message: "Failed to update vote status" });
    }
  });

  app.delete("/api/vote/:voteId", isAdmin, async (req: any, res) => {
    try {
      await storage.deleteEventVote(req.params.voteId);
      res.json({ message: "Vote deleted" });
    } catch (error) {
      console.error("Error deleting vote:", error);
      res.status(500).json({ message: "Failed to delete vote" });
    }
  });

  app.post("/api/vote/:voteId/clear-ballots", isAdmin, async (req: any, res) => {
    try {
      await storage.clearEventVoteBallots(req.params.voteId);
      res.json({ message: "All ballots and results cleared" });
    } catch (error) {
      console.error("Error clearing ballots:", error);
      res.status(500).json({ message: "Failed to clear ballots" });
    }
  });

  // Set category entries for a vote (admin only) - set all registrations for a category
  app.put("/api/vote/:voteId/categories/:categoryId/entries", isAdmin, async (req: any, res) => {
    try {
      const { registrationIds } = req.body;
      if (!Array.isArray(registrationIds)) {
        res.status(400).json({ message: "registrationIds must be an array" });
        return;
      }
      await storage.setVoteCategoryEntries(req.params.voteId, req.params.categoryId, registrationIds);
      const voteWithDetails = await storage.getEventVoteWithDetails(req.params.voteId);
      res.json(voteWithDetails);
    } catch (error) {
      console.error("Error setting category entries:", error);
      res.status(500).json({ message: "Failed to set category entries" });
    }
  });

  // Submit a ballot (user voting)
  app.post("/api/vote/:voteId/ballots", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const { voterRegistrationId, votes } = req.body;
      if (!voterRegistrationId || !Array.isArray(votes)) {
        res.status(400).json({ message: "voterRegistrationId and votes array required" });
        return;
      }

      // Verify voter registration belongs to user and is accepted
      const voterReg = await storage.getRegistration(voterRegistrationId);
      if (!voterReg || voterReg.userId !== req.user.id) {
        res.status(403).json({ message: "You can only vote with your own registered participants" });
        return;
      }
      if (!voterReg.accepted) {
        res.status(403).json({ message: "Only accepted registrations are allowed to vote" });
        return;
      }

      // Check vote exists and is open
      const voteWithDetails = await storage.getEventVoteWithDetails(req.params.voteId);
      if (!voteWithDetails) {
        res.status(404).json({ message: "Vote not found" });
        return;
      }

      // Check voting window
      const event = await storage.getEvent(voteWithDetails.eventId);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      const now = new Date();
      if (event.votingStartDate && now < new Date(event.votingStartDate)) {
        res.status(400).json({ message: "Voting has not started yet" });
        return;
      }
      if (event.votingEndDate && now > new Date(event.votingEndDate)) {
        res.status(400).json({ message: "Voting has ended" });
        return;
      }

      if (voteWithDetails.status !== "open" && voteWithDetails.status !== "draft") {
        res.status(400).json({ message: "Voting is not currently open" });
        return;
      }

      // Check if this participant already voted
      const existingBallot = await storage.getBallotsByVoter(req.params.voteId, voterRegistrationId);
      if (existingBallot) {
        res.status(400).json({ message: "This participant has already voted" });
        return;
      }

      // Create ballot with entries
      const ballot = await storage.createBallotWithEntries(
        { eventVoteId: req.params.voteId, voterRegistrationId },
        votes.map((v: { votingCategoryId: string; selectedRegistrationId: string }) => ({
          votingCategoryId: v.votingCategoryId,
          selectedRegistrationId: v.selectedRegistrationId,
        }))
      );

      res.status(201).json(ballot);
    } catch (error) {
      console.error("Error submitting ballot:", error);
      res.status(500).json({ message: "Failed to submit ballot" });
    }
  });

  // Get user's ballots for a vote
  app.get("/api/vote/:voteId/ballots/me", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const eventId = req.query.eventId as string;
      if (!eventId) {
        res.status(400).json({ message: "eventId required" });
        return;
      }

      const allUserRegs = await storage.getRegistrationsByUser(req.user.id, eventId);
      const userRegs = allUserRegs.filter((r) => r.accepted);
      const ballots: { registrationId: string; participantName: string; hasVoted: boolean }[] = [];

      for (const reg of userRegs) {
        const ballot = await storage.getBallotsByVoter(req.params.voteId, reg.id);
        ballots.push({
          registrationId: reg.id,
          participantName: reg.participantName,
          hasVoted: !!ballot,
        });
      }

      res.json(ballots);
    } catch (error) {
      console.error("Error fetching user ballots:", error);
      res.status(500).json({ message: "Failed to fetch ballots" });
    }
  });

  app.get("/api/vote/:voteId/participants-status", isAdmin, async (req: any, res) => {
    try {
      const vote = await storage.getEventVoteWithDetails(req.params.voteId);
      if (!vote) {
        res.status(404).json({ message: "Vote not found" });
        return;
      }
      const allRegs = await storage.getRegistrationsByEvent(vote.eventId);
      console.log("participants-status: allRegs count:", allRegs.length, "accepted:", allRegs.filter((r) => r.accepted).length, "accepted values:", allRegs.map(r => ({ name: r.participantName, accepted: r.accepted })));
      const acceptedRegs = allRegs.filter((r) => r.accepted);
      const ballots = await storage.getBallotsByEvent(req.params.voteId);
      const voterRegIds = new Set(ballots.map((b) => b.voterRegistrationId));

      const participants = acceptedRegs.map((reg) => ({
        registrationId: reg.id,
        participantName: reg.participantName,
        denName: reg.den?.name || null,
        hasVoted: voterRegIds.has(reg.id),
      }));

      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      res.json(participants);
    } catch (error) {
      console.error("Error fetching participants status:", error);
      res.status(500).json({ message: "Failed to fetch participants status" });
    }
  });

  app.get("/api/vote/:voteId/tally", isAdmin, async (req, res) => {
    try {
      const tally = await storage.getVoteTally(req.params.voteId);
      const ballots = await storage.getBallotsByEvent(req.params.voteId);
      res.json({ tally, totalBallots: ballots.length });
    } catch (error) {
      console.error("Error fetching vote tally:", error);
      res.status(500).json({ message: "Failed to fetch tally" });
    }
  });

  // Set vote results (admin only)
  app.post("/api/vote/:voteId/results", isAdmin, async (req: any, res) => {
    try {
      const { results } = req.body;
      if (!Array.isArray(results)) {
        res.status(400).json({ message: "results must be an array" });
        return;
      }

      const savedResults = await storage.setVoteResults(
        req.params.voteId,
        results.map((r: any) => ({
          votingCategoryId: r.votingCategoryId,
          winnerRegistrationId: r.winnerRegistrationId,
          voteCount: r.voteCount || 0,
          isOverride: r.isOverride || false,
        }))
      );

      res.json(savedResults);
    } catch (error) {
      console.error("Error setting vote results:", error);
      res.status(500).json({ message: "Failed to set results" });
    }
  });

  // Get published results for an event (public)
  app.get("/api/events/:id/results", isAuthenticated, async (req, res) => {
    try {
      const eventId = req.params.id;
      const eventVote = await storage.getEventVoteByEvent(eventId);
      if (!eventVote || eventVote.status !== "published") {
        res.json(null);
        return;
      }

      const voteWithDetails = await storage.getEventVoteWithDetails(eventVote.id);
      res.json(voteWithDetails);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // ============ RACING AWARD ROUTES ============

  app.get("/api/events/:id/racing-awards", isAuthenticated, async (req, res) => {
    try {
      const awards = await storage.getRacingAwardsWithResults(req.params.id);
      res.json(awards);
    } catch (error) {
      console.error("Error fetching racing awards:", error);
      res.status(500).json({ message: "Failed to fetch racing awards" });
    }
  });

  app.post("/api/racing-awards", isAdmin, async (req, res) => {
    try {
      const parsed = insertRacingAwardSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid racing award data", errors: parsed.error.issues });
        return;
      }
      const award = await storage.createRacingAward(parsed.data);
      res.status(201).json(award);
    } catch (error) {
      console.error("Error creating racing award:", error);
      res.status(500).json({ message: "Failed to create racing award" });
    }
  });

  app.delete("/api/racing-awards/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteRacingAward(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting racing award:", error);
      res.status(500).json({ message: "Failed to delete racing award" });
    }
  });

  app.post("/api/racing-awards/:id/result", isAdmin, async (req, res) => {
    try {
      const { winnerRegistrationId } = req.body;
      if (!winnerRegistrationId) {
        res.status(400).json({ message: "winnerRegistrationId is required" });
        return;
      }
      const result = await storage.setRacingAwardResult(req.params.id, winnerRegistrationId);
      res.json(result);
    } catch (error) {
      console.error("Error setting racing award result:", error);
      res.status(500).json({ message: "Failed to set racing award result" });
    }
  });

  app.delete("/api/racing-awards/:id/result", isAdmin, async (req, res) => {
    try {
      await storage.removeRacingAwardResult(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing racing award result:", error);
      res.status(500).json({ message: "Failed to remove racing award result" });
    }
  });

  app.post("/api/events/:id/racing-awards/publish", isAdmin, async (req, res) => {
    try {
      const { published } = req.body;
      if (typeof published !== "boolean") {
        res.status(400).json({ message: "published must be a boolean" });
        return;
      }
      await storage.publishRacingAwardResults(req.params.id, published);
      res.json({ success: true });
    } catch (error) {
      console.error("Error publishing racing award results:", error);
      res.status(500).json({ message: "Failed to publish racing award results" });
    }
  });

  // ============ EXPORT ROUTES ============

  app.get("/api/events/:id/export", isAdmin, async (req, res) => {
    let exportDir: string | null = null;
    
    try {
      const eventId = req.params.id;
      const event = await storage.getEventWithDetails(eventId);
      
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      const registrations = event.registrations || [];
      
      // Ensure base exports directory exists
      const exportsBaseDir = path.join(process.cwd(), "exports");
      if (!fs.existsSync(exportsBaseDir)) {
        fs.mkdirSync(exportsBaseDir, { recursive: true });
      }
      
      // Create a temporary directory for export
      exportDir = path.join(exportsBaseDir, `export-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const photosDir = path.join(exportDir, "photos");
      const participantPhotosDir = path.join(photosDir, "participants");
      const carPhotosDir = path.join(photosDir, "cars");
      
      fs.mkdirSync(participantPhotosDir, { recursive: true });
      fs.mkdirSync(carPhotosDir, { recursive: true });

      // Helper function to sanitize filenames
      const sanitizeFilename = (name: string): string => {
        return name
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "_")
          .toLowerCase();
      };

      // Helper function to parse name into first and last
      const parseName = (fullName: string): { firstName: string; lastName: string } => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) {
          return { firstName: parts[0], lastName: "" };
        }
        const lastName = parts.pop() || "";
        const firstName = parts.join(" ");
        return { firstName, lastName };
      };

      // Helper function to safely get a file from uploads directory (prevents path traversal)
      const safeGetUploadPath = (pictureUrl: string | null): string | null => {
        if (!pictureUrl) return null;
        if (!pictureUrl.startsWith("/uploads/")) return null;
        
        const filename = path.basename(pictureUrl);
        const sourcePath = path.join(uploadsDir, filename);
        const normalizedPath = path.normalize(sourcePath);
        
        // Ensure the path is within uploadsDir
        if (!normalizedPath.startsWith(path.normalize(uploadsDir))) {
          return null;
        }
        
        return fs.existsSync(normalizedPath) ? normalizedPath : null;
      };

      // Build CSV rows and copy photos
      const csvRows: string[] = [];
      csvRows.push("Last Name,First Name,Car#,Car Name,Category,Participant Photo,Car Photo");

      const sortedRegistrations = [...registrations].sort((a, b) => 
        a.participantName.localeCompare(b.participantName)
      );

      for (let i = 0; i < sortedRegistrations.length; i++) {
        const reg = sortedRegistrations[i];
        const { firstName, lastName } = parseName(reg.participantName);
        const carNumber = reg.carNumber != null ? String(reg.carNumber) : "";
        const carName = reg.carName || "";
        const category = reg.den?.name || "";
        const safeName = sanitizeFilename(reg.participantName) || `participant_${i + 1}`;

        let participantPhotoPath = "";
        let carPhotoPath = "";

        // Copy participant photo if exists
        const participantSourcePath = safeGetUploadPath(reg.participantPictureUrl);
        if (participantSourcePath) {
          const ext = path.extname(participantSourcePath);
          const destFilename = `${safeName}${ext}`;
          const destPath = path.join(participantPhotosDir, destFilename);
          fs.copyFileSync(participantSourcePath, destPath);
          participantPhotoPath = `photos/participants/${destFilename}`;
        }

        // Copy car photo if exists
        const carSourcePath = safeGetUploadPath(reg.carPictureUrl);
        if (carSourcePath) {
          const ext = path.extname(carSourcePath);
          const destFilename = `${safeName}_car${ext}`;
          const destPath = path.join(carPhotosDir, destFilename);
          fs.copyFileSync(carSourcePath, destPath);
          carPhotoPath = `photos/cars/${destFilename}`;
        }

        // Escape CSV fields that might contain commas
        const escapeCSV = (field: string) => {
          if (field.includes(",") || field.includes('"') || field.includes("\n")) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        };

        csvRows.push([
          escapeCSV(lastName),
          escapeCSV(firstName),
          carNumber,
          escapeCSV(carName),
          escapeCSV(category),
          escapeCSV(participantPhotoPath),
          escapeCSV(carPhotoPath),
        ].join(","));
      }

      // Write CSV file
      const csvContent = csvRows.join("\n");
      const csvPath = path.join(exportDir, "roster.csv");
      fs.writeFileSync(csvPath, csvContent);

      // Create ZIP archive
      const eventName = sanitizeFilename(event.name) || "derby_event";
      const zipFilename = `${eventName}_roster.zip`;
      
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      
      archive.on("error", (err) => {
        console.error("Archive error:", err);
      });

      archive.pipe(res);
      archive.directory(exportDir, false);
      
      await archive.finalize();

      // Clean up temp directory after streaming completes
      const dirToClean = exportDir;
      res.on("finish", () => {
        try {
          fs.rmSync(dirToClean, { recursive: true, force: true });
        } catch (e) {
          console.error("Failed to clean up export directory:", e);
        }
      });

    } catch (error) {
      console.error("Error exporting registrations:", error);
      
      // Clean up on error if exportDir was created
      if (exportDir && fs.existsSync(exportDir)) {
        try {
          fs.rmSync(exportDir, { recursive: true, force: true });
        } catch (e) {
          console.error("Failed to clean up export directory on error:", e);
        }
      }
      
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export registrations" });
      }
    }
  });

  // Error handling middleware for multer and other errors
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: "File too large. Maximum size is 5MB per image." 
        });
      }
      return res.status(400).json({ 
        message: `Upload error: ${err.message}` 
      });
    }
    
    if (err.message === 'Only image files are allowed') {
      return res.status(400).json({ 
        message: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." 
      });
    }
    
    // Pass other errors to default handler
    next(err);
  });

  return httpServer;
}
