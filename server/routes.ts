import express, { type Express, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import archiver from "archiver";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAdmin, isAuthenticated, authStorage } from "./replit_integrations/auth";
import { inviteLinkExpiresAt } from "./replit_integrations/auth/storage";
import {
  insertDerbyEventSchema,
  updateDerbyEventSchema,
  insertDenSchema,
  insertVotingCategorySchema,
  insertRegistrationSchema,
  updateRegistrationSchema,
  insertRacingAwardSchema,
  ballotSubmissionSchema,
  type DerbyEvent,
  type Registration,
  type RegistrationWithDen,
  type PublicRegistration,
} from "@shared/schema";
import { z } from "zod";

// ============ UPLOAD HANDLING ============

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

// Extension is derived from the declared mime type, never from the client's filename.
const mimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = mimeToExt[file.mimetype] ?? ".bin";
      cb(null, crypto.randomBytes(16).toString("hex") + ext);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 2, fields: 20 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = [".jpeg", ".jpg", ".png", ".gif", ".webp"].includes(ext);
    const mimeOk = Object.prototype.hasOwnProperty.call(mimeToExt, file.mimetype);
    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

type UploadedFiles = { [fieldname: string]: Express.Multer.File[] } | undefined;

// Check the first bytes of a stored upload really look like one of the allowed image types.
function looksLikeImage(filePath: string): boolean {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(12);
    const read = fs.readSync(fd, header, 0, 12, 0);
    if (read < 4) return false;
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return true; // JPEG
    if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // PNG
    if (header.subarray(0, 4).toString("ascii") === "GIF8") return true; // GIF
    if (read >= 12 && header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP") return true; // WebP
    return false;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function allUploadedFiles(files: UploadedFiles): Express.Multer.File[] {
  if (!files) return [];
  return Object.values(files).flat();
}

function discardUploadedFiles(files: UploadedFiles): void {
  for (const f of allUploadedFiles(files)) {
    fs.rm(f.path, { force: true }, () => {});
  }
}

// Map a stored "/uploads/<name>" URL back to a path inside uploadsDir, or null if it isn't one.
function uploadUrlToPath(pictureUrl: string | null | undefined): string | null {
  if (!pictureUrl || !pictureUrl.startsWith("/uploads/")) return null;
  const filename = path.basename(pictureUrl);
  const resolved = path.resolve(uploadsDir, filename);
  if (path.dirname(resolved) !== path.resolve(uploadsDir)) return null;
  return resolved;
}

function removeUploadByUrl(pictureUrl: string | null | undefined): void {
  const p = uploadUrlToPath(pictureUrl);
  if (p) fs.rm(p, { force: true }, () => {});
}

// Returns an error message if any uploaded file fails the content check.
function validateUploadedImages(files: UploadedFiles): string | null {
  for (const f of allUploadedFiles(files)) {
    if (!looksLikeImage(f.path)) {
      return "Uploaded file is not a valid image";
    }
  }
  return null;
}

// ============ HELPERS ============

const idParam = z.string().min(1).max(100);

function isUniqueViolation(error: any): boolean {
  return error?.code === "23505" || error?.cause?.code === "23505";
}

function isForeignKeyViolation(error: any): boolean {
  return error?.code === "23503" || error?.cause?.code === "23503";
}

function registrationWindowOpen(event: DerbyEvent): boolean {
  if (!event.registrationStartDate || !event.registrationEndDate) return false;
  const start = new Date(event.registrationStartDate).getTime();
  const end = new Date(event.registrationEndDate).getTime();
  if (isNaN(start) || isNaN(end)) return false;
  const now = Date.now();
  return now >= start && now <= end;
}

function toPublicRegistration(
  reg: RegistrationWithDen,
  opts: { showParticipantPhotos: boolean; showCarDetails: boolean },
): PublicRegistration {
  return {
    id: reg.id,
    eventId: reg.eventId,
    denId: reg.denId,
    den: reg.den,
    participantName: reg.participantName,
    participantPictureUrl: opts.showParticipantPhotos ? reg.participantPictureUrl : null,
    carName: opts.showCarDetails ? reg.carName : null,
    carPictureUrl: opts.showCarDetails ? reg.carPictureUrl : null,
    carNumber: reg.carNumber,
    accepted: reg.accepted,
    votingCategoryIds: opts.showCarDetails ? reg.votingCategoryIds : [],
    createdAt: reg.createdAt,
  };
}

// Parse JSON that arrives as a multipart form field.
function parseJsonField(value: unknown): { ok: true; value: unknown } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, value: undefined };
  if (typeof value !== "string") return { ok: false };
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

// Reject cross-site state-changing requests. Browsers always send an Origin
// header on cross-origin requests; same-origin requests either carry a matching
// Origin or none at all. Combined with SameSite=Lax cookies this blocks CSRF.
const sameOriginOnly: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  const origin = req.get("origin");
  const referer = req.get("referer");
  let source: string | undefined;
  try {
    if (origin && origin !== "null") source = new URL(origin).hostname;
    else if (referer) source = new URL(referer).hostname;
  } catch {
    res.status(403).json({ message: "Invalid request origin" });
    return;
  }
  if (source && source !== req.hostname) {
    res.status(403).json({ message: "Cross-site requests are not allowed" });
    return;
  }
  next();
};

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down" },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts, please try again later" },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many uploads, please try again later" },
});

const ballotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many ballot submissions, please try again later" },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api", apiLimiter);
  app.use("/api/login", loginLimiter);
  app.use("/api", sameOriginOnly);

  // Setup auth (Google OAuth via Passport, PostgreSQL-backed sessions)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Uploaded photos are only visible to signed-in, active users.
  app.use(
    "/uploads",
    isAuthenticated,
    express.static(uploadsDir, {
      maxAge: "7d",
      immutable: true,
      index: false,
      dotfiles: "deny",
      setHeaders: (res) => {
        // Never let the browser sniff an upload into something executable
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Disposition", "inline");
      },
    }),
  );

  // ============ PUBLIC CONFIG ============

  app.get("/api/config", (_req, res) => {
    const packName = process.env.PACK_NAME || null;
    res.json({ packName });
  });

  // ============ EVENT ROUTES ============

  app.get("/api/events", isAuthenticated, async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/active", isAuthenticated, async (_req, res) => {
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
          return new Date() > endDate;
        }
        return defaultValue;
      };

      const showCarDetails = adminPreviewMode || shouldShowContent(event.carDetailsVisibility, false);
      const showParticipantPhotos = adminPreviewMode || shouldShowContent(event.participantPhotosVisibility, true);

      const registrations = (event.registrations ?? []).map((reg) =>
        toPublicRegistration(reg, { showParticipantPhotos, showCarDetails }),
      );

      res.json({ registrations, adminPreviewMode });
    } catch (error) {
      console.error("Error fetching active event registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.get("/api/events/active/content", isAuthenticated, async (_req, res) => {
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

  // Full event details include every registration (names, notes, who registered them): admin only.
  app.get("/api/events/:id", isAdmin, async (req, res) => {
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

  app.post("/api/events", isAdmin, async (req: any, res) => {
    try {
      const { copyFromEventId, ...eventData } = req.body ?? {};
      const parsed = insertDerbyEventSchema.safeParse(eventData);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid event data", errors: parsed.error.issues });
        return;
      }
      const copyId = idParam.safeParse(copyFromEventId);
      const sourceEvent = copyId.success ? await storage.getEventWithDetails(copyId.data) : undefined;

      const event = await storage.createEvent({
        ...parsed.data,
        rules: sourceEvent ? sourceEvent.rules : parsed.data.rules,
        createdById: req.user.id,
      });

      // Copy dens, voting categories and racing awards (without results) from the source event
      if (sourceEvent) {
        for (const den of sourceEvent.dens) {
          await storage.createDen({ eventId: event.id, name: den.name, sortOrder: den.sortOrder });
        }
        for (const category of sourceEvent.votingCategories) {
          await storage.createVotingCategory({
            eventId: event.id,
            name: category.name,
            description: category.description,
            sortOrder: category.sortOrder,
          });
        }
        const sourceAwards = await storage.getRacingAwardsByEvent(sourceEvent.id);
        for (const award of sourceAwards) {
          await storage.createRacingAward({
            eventId: event.id,
            name: award.name,
            description: award.description,
            sortOrder: award.sortOrder,
          });
        }
      }

      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", isAdmin, async (req, res) => {
    try {
      const parsed = updateDerbyEventSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid event data", errors: parsed.error.issues });
        return;
      }
      const event = await storage.updateEvent(req.params.id, parsed.data);
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

  app.delete("/api/events/:id", isAdmin, async (req, res) => {
    try {
      const event = await storage.getEventWithDetails(req.params.id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      await storage.deleteEvent(req.params.id);
      for (const reg of event.registrations) {
        removeUploadByUrl(reg.participantPictureUrl);
        removeUploadByUrl(reg.carPictureUrl);
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============ DEN ROUTES ============

  app.post("/api/dens", isAdmin, async (req, res) => {
    try {
      const parsed = insertDenSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid den data", errors: parsed.error.issues });
        return;
      }
      const den = await storage.createDen(parsed.data);
      res.status(201).json(den);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        res.status(400).json({ message: "Event not found" });
        return;
      }
      console.error("Error creating den:", error);
      res.status(500).json({ message: "Failed to create den" });
    }
  });

  app.delete("/api/dens/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteDen(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting den:", error);
      res.status(500).json({ message: "Failed to delete den" });
    }
  });

  // ============ VOTING CATEGORY ROUTES ============

  app.post("/api/voting-categories", isAdmin, async (req, res) => {
    try {
      const parsed = insertVotingCategorySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid category data", errors: parsed.error.issues });
        return;
      }
      const category = await storage.createVotingCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        res.status(400).json({ message: "Event not found" });
        return;
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.delete("/api/voting-categories/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteVotingCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // ============ REGISTRATION ROUTES ============

  app.get("/api/registrations", isAdmin, async (req, res) => {
    try {
      const eventId = idParam.safeParse(req.query.eventId);
      if (!eventId.success) {
        res.status(400).json({ message: "eventId query parameter required" });
        return;
      }
      const regs = await storage.getRegistrationsByEvent(eventId.data);
      res.json(regs);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Get registrations for the current logged-in user
  app.get("/api/registrations/my", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = idParam.safeParse(req.query.eventId);
      if (!eventId.success) {
        res.status(400).json({ message: "eventId query parameter required" });
        return;
      }
      const regs = await storage.getRegistrationsByUser(req.user.id, eventId.data);
      res.json(regs);
    } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Get a single registration by ID (owner or admin only)
  app.get("/api/registrations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const registration = await storage.getRegistrationWithDen(req.params.id);
      if (!registration) {
        res.status(404).json({ message: "Registration not found" });
        return;
      }
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

  // Checks shared by create/update: den and categories must belong to the event.
  async function validateRegistrationRefs(
    eventId: string,
    denId: string | null | undefined,
    votingCategoryIds: string[] | null | undefined,
  ): Promise<string | null> {
    if (denId) {
      const dens = await storage.getDensByEvent(eventId);
      if (!dens.some((d) => d.id === denId)) return "Invalid den for this event";
    }
    if (votingCategoryIds && votingCategoryIds.length > 0) {
      const categories = await storage.getVotingCategoriesByEvent(eventId);
      const valid = new Set(categories.map((c) => c.id));
      if (!votingCategoryIds.every((id) => valid.has(id))) return "Invalid voting category for this event";
    }
    return null;
  }

  // Loads the registration named in :id and rejects non-owners before any upload is accepted.
  const loadOwnedRegistration: RequestHandler = async (req: any, res, next) => {
    try {
      const existing = await storage.getRegistration(req.params.id);
      if (!existing) {
        res.status(404).json({ message: "Registration not found" });
        return;
      }
      if (existing.userId !== req.user.id && !req.user.isAdmin) {
        res.status(403).json({ message: "You can only edit your own registrations" });
        return;
      }
      if (!req.user.isAdmin) {
        const event = await storage.getEvent(existing.eventId);
        if (!event || !event.isActive || !registrationWindowOpen(event)) {
          res.status(400).json({ message: "Registration is closed for this event" });
          return;
        }
      }
      req.registration = existing as Registration;
      next();
    } catch (error) {
      console.error("Error loading registration:", error);
      res.status(500).json({ message: "Failed to load registration" });
    }
  };

  app.post(
    "/api/registrations",
    isAuthenticated,
    uploadLimiter,
    upload.fields([
      { name: "participantPicture", maxCount: 1 },
      { name: "carPicture", maxCount: 1 },
    ]),
    async (req: any, res) => {
      const files = req.files as UploadedFiles;
      let keepFiles = false;
      try {
        const categoryField = parseJsonField(req.body.votingCategoryIds);
        if (!categoryField.ok) {
          res.status(400).json({ message: "votingCategoryIds must be JSON" });
          return;
        }

        const parsed = insertRegistrationSchema.safeParse({
          eventId: req.body.eventId,
          userId: req.user.id,
          participantName: req.body.participantName,
          denId: req.body.denId || null,
          carName: req.body.carName || null,
          participantPictureUrl: files?.participantPicture ? `/uploads/${files.participantPicture[0].filename}` : null,
          carPictureUrl: files?.carPicture ? `/uploads/${files.carPicture[0].filename}` : null,
          votingCategoryIds: categoryField.value ?? [],
          notes: req.body.notes || null,
        });
        if (!parsed.success) {
          res.status(400).json({ message: "Invalid registration data", errors: parsed.error.issues });
          return;
        }

        const event = await storage.getEvent(parsed.data.eventId);
        if (!event) {
          res.status(404).json({ message: "Event not found" });
          return;
        }
        if (!req.user.isAdmin && (!event.isActive || !registrationWindowOpen(event))) {
          res.status(400).json({ message: "Registration is closed for this event" });
          return;
        }

        const refError = await validateRegistrationRefs(event.id, parsed.data.denId, parsed.data.votingCategoryIds);
        if (refError) {
          res.status(400).json({ message: refError });
          return;
        }

        const imageError = validateUploadedImages(files);
        if (imageError) {
          res.status(400).json({ message: imageError });
          return;
        }

        const registration = await storage.createRegistration(parsed.data);
        keepFiles = true;
        res.status(201).json(registration);
      } catch (error) {
        console.error("Error creating registration:", error);
        res.status(500).json({ message: "Failed to create registration" });
      } finally {
        if (!keepFiles) discardUploadedFiles(files);
      }
    }
  );

  app.patch(
    "/api/registrations/:id",
    isAuthenticated,
    loadOwnedRegistration,
    uploadLimiter,
    upload.fields([
      { name: "participantPicture", maxCount: 1 },
      { name: "carPicture", maxCount: 1 },
    ]),
    async (req: any, res) => {
      const files = req.files as UploadedFiles;
      const existing: Registration = req.registration;
      let keepFiles = false;
      try {
        const categoryField = parseJsonField(req.body.votingCategoryIds);
        if (!categoryField.ok) {
          res.status(400).json({ message: "votingCategoryIds must be JSON" });
          return;
        }

        const candidate: Record<string, unknown> = {};
        if (req.body.participantName !== undefined) candidate.participantName = req.body.participantName;
        if (req.body.denId !== undefined) candidate.denId = req.body.denId || null;
        if (req.body.carName !== undefined) candidate.carName = req.body.carName || null;
        if (categoryField.value !== undefined) candidate.votingCategoryIds = categoryField.value;
        if (req.body.notes !== undefined) candidate.notes = req.body.notes || null;

        const parsed = updateRegistrationSchema.safeParse(candidate);
        if (!parsed.success) {
          res.status(400).json({ message: "Invalid registration data", errors: parsed.error.issues });
          return;
        }

        const refError = await validateRegistrationRefs(existing.eventId, parsed.data.denId, parsed.data.votingCategoryIds);
        if (refError) {
          res.status(400).json({ message: refError });
          return;
        }

        const imageError = validateUploadedImages(files);
        if (imageError) {
          res.status(400).json({ message: imageError });
          return;
        }

        const updates: Parameters<typeof storage.updateRegistration>[1] = { ...parsed.data };
        // Only admins decide whether a registration is accepted (that is what gates voting)
        if (req.user.isAdmin && req.body.accepted !== undefined) {
          updates.accepted = req.body.accepted === "true" || req.body.accepted === true;
        }
        if (files?.participantPicture) {
          updates.participantPictureUrl = `/uploads/${files.participantPicture[0].filename}`;
        }
        if (files?.carPicture) {
          updates.carPictureUrl = `/uploads/${files.carPicture[0].filename}`;
        }

        const registration = await storage.updateRegistration(req.params.id, updates);
        if (!registration) {
          res.status(404).json({ message: "Registration not found" });
          return;
        }
        keepFiles = true;
        // Replaced photos are no longer referenced; remove them from disk
        if (updates.participantPictureUrl && existing.participantPictureUrl !== updates.participantPictureUrl) {
          removeUploadByUrl(existing.participantPictureUrl);
        }
        if (updates.carPictureUrl && existing.carPictureUrl !== updates.carPictureUrl) {
          removeUploadByUrl(existing.carPictureUrl);
        }
        res.json(registration);
      } catch (error) {
        console.error("Error updating registration:", error);
        res.status(500).json({ message: "Failed to update registration" });
      } finally {
        if (!keepFiles) discardUploadedFiles(files);
      }
    }
  );

  app.patch("/api/registrations/:id/accepted", isAdmin, async (req, res) => {
    try {
      const { accepted } = req.body ?? {};
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

  app.delete("/api/registrations/:id", isAuthenticated, loadOwnedRegistration, async (req: any, res) => {
    try {
      const existing: Registration = req.registration;
      await storage.deleteRegistration(existing.id);
      removeUploadByUrl(existing.participantPictureUrl);
      removeUploadByUrl(existing.carPictureUrl);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting registration:", error);
      res.status(500).json({ message: "Failed to delete registration" });
    }
  });

  // ============ ADMIN USER MANAGEMENT ROUTES ============

  app.get("/api/admin/users", isAdmin, async (_req, res) => {
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
      const { isAdmin: adminStatus } = req.body ?? {};
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
      const { accessStatus } = req.body ?? {};
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
      if (isForeignKeyViolation(error)) {
        res.status(400).json({ message: "Cannot delete a user who still has registrations. Remove or reassign their registrations first." });
        return;
      }
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ============ INVITE LINK ROUTES ============

  app.get("/api/admin/invite-link", isAdmin, async (_req, res) => {
    try {
      const link = await authStorage.getInviteLink();
      res.json(link ? { ...link, expiresAt: inviteLinkExpiresAt(link) } : null);
    } catch (error) {
      console.error("Error fetching invite link:", error);
      res.status(500).json({ message: "Failed to fetch invite link" });
    }
  });

  app.post("/api/admin/invite-link", isAdmin, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const link = await authStorage.createInviteLink(currentUser.id);
      res.json({ ...link, expiresAt: inviteLinkExpiresAt(link) });
    } catch (error) {
      console.error("Error creating invite link:", error);
      res.status(500).json({ message: "Failed to create invite link" });
    }
  });

  app.delete("/api/admin/invite-link", isAdmin, async (_req, res) => {
    try {
      await authStorage.deleteInviteLink();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invite link:", error);
      res.status(500).json({ message: "Failed to delete invite link" });
    }
  });

  // ============ VOTING ROUTES ============

  // Get vote for an event (includes entries); non-admins only see car details, not who owns them
  app.get("/api/events/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const eventVote = await storage.getEventVoteByEvent(req.params.id);
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
          for (const catId of Array.from(new Set(reg.votingCategoryIds))) {
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
  app.patch("/api/vote/:voteId/status", isAdmin, async (req, res) => {
    try {
      const { status } = req.body ?? {};
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

  app.delete("/api/vote/:voteId", isAdmin, async (req, res) => {
    try {
      await storage.deleteEventVote(req.params.voteId);
      res.json({ message: "Vote deleted" });
    } catch (error) {
      console.error("Error deleting vote:", error);
      res.status(500).json({ message: "Failed to delete vote" });
    }
  });

  app.post("/api/vote/:voteId/clear-ballots", isAdmin, async (req, res) => {
    try {
      await storage.clearEventVoteBallots(req.params.voteId);
      res.json({ message: "All ballots and results cleared" });
    } catch (error) {
      console.error("Error clearing ballots:", error);
      res.status(500).json({ message: "Failed to clear ballots" });
    }
  });

  // Set category entries for a vote (admin only) - set all registrations for a category
  app.put("/api/vote/:voteId/categories/:categoryId/entries", isAdmin, async (req, res) => {
    try {
      const body = z.object({ registrationIds: z.array(idParam).max(500) }).safeParse(req.body ?? {});
      if (!body.success) {
        res.status(400).json({ message: "registrationIds must be an array" });
        return;
      }
      const vote = await storage.getEventVoteWithDetails(req.params.voteId);
      if (!vote) {
        res.status(404).json({ message: "Vote not found" });
        return;
      }
      const event = await storage.getEventWithDetails(vote.eventId);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      if (!event.votingCategories.some((c) => c.id === req.params.categoryId)) {
        res.status(400).json({ message: "Category does not belong to this event" });
        return;
      }
      const eventRegIds = new Set(event.registrations.map((r) => r.id));
      if (!body.data.registrationIds.every((id) => eventRegIds.has(id))) {
        res.status(400).json({ message: "All registrations must belong to this event" });
        return;
      }

      await storage.setVoteCategoryEntries(req.params.voteId, req.params.categoryId, body.data.registrationIds);
      const voteWithDetails = await storage.getEventVoteWithDetails(req.params.voteId);
      res.json(voteWithDetails);
    } catch (error) {
      console.error("Error setting category entries:", error);
      res.status(500).json({ message: "Failed to set category entries" });
    }
  });

  // Submit a ballot (user voting)
  app.post("/api/vote/:voteId/ballots", isAuthenticated, ballotLimiter, async (req: any, res) => {
    try {
      const parsed = ballotSubmissionSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "voterRegistrationId and votes array required", errors: parsed.error.issues });
        return;
      }
      const { voterRegistrationId, votes } = parsed.data;

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

      const voteWithDetails = await storage.getEventVoteWithDetails(req.params.voteId);
      if (!voteWithDetails) {
        res.status(404).json({ message: "Vote not found" });
        return;
      }
      if (voteWithDetails.eventId !== voterReg.eventId) {
        res.status(403).json({ message: "This participant is not registered for this event" });
        return;
      }

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

      // Every choice must be a real entry in that category, one choice per
      // category, and nobody may vote for their own car.
      const entriesByCategory = new Map<string, Set<string>>();
      for (const entry of voteWithDetails.categoryEntries) {
        if (!entriesByCategory.has(entry.votingCategoryId)) entriesByCategory.set(entry.votingCategoryId, new Set());
        entriesByCategory.get(entry.votingCategoryId)!.add(entry.registrationId);
      }
      const seenCategories = new Set<string>();
      for (const v of votes) {
        const allowed = entriesByCategory.get(v.votingCategoryId);
        if (!allowed || !allowed.has(v.selectedRegistrationId)) {
          res.status(400).json({ message: "Invalid selection for a voting category" });
          return;
        }
        if (v.selectedRegistrationId === voterRegistrationId) {
          res.status(400).json({ message: "You cannot vote for your own car" });
          return;
        }
        if (seenCategories.has(v.votingCategoryId)) {
          res.status(400).json({ message: "Only one selection per category is allowed" });
          return;
        }
        seenCategories.add(v.votingCategoryId);
      }

      const existingBallot = await storage.getBallotsByVoter(req.params.voteId, voterRegistrationId);
      if (existingBallot) {
        res.status(400).json({ message: "This participant has already voted" });
        return;
      }

      const ballot = await storage.createBallotWithEntries(
        { eventVoteId: req.params.voteId, voterRegistrationId },
        votes.map((v) => ({
          votingCategoryId: v.votingCategoryId,
          selectedRegistrationId: v.selectedRegistrationId,
        }))
      );

      res.status(201).json(ballot);
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(400).json({ message: "This participant has already voted" });
        return;
      }
      console.error("Error submitting ballot:", error);
      res.status(500).json({ message: "Failed to submit ballot" });
    }
  });

  // Get user's ballots for a vote
  app.get("/api/vote/:voteId/ballots/me", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = idParam.safeParse(req.query.eventId);
      if (!eventId.success) {
        res.status(400).json({ message: "eventId required" });
        return;
      }

      const allUserRegs = await storage.getRegistrationsByUser(req.user.id, eventId.data);
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

  app.get("/api/vote/:voteId/participants-status", isAdmin, async (req, res) => {
    try {
      const vote = await storage.getEventVoteWithDetails(req.params.voteId);
      if (!vote) {
        res.status(404).json({ message: "Vote not found" });
        return;
      }
      const allRegs = await storage.getRegistrationsByEvent(vote.eventId);
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
  app.post("/api/vote/:voteId/results", isAdmin, async (req, res) => {
    try {
      const body = z.object({
        results: z.array(z.object({
          votingCategoryId: idParam,
          winnerRegistrationId: idParam,
          voteCount: z.number().int().min(0).optional(),
          isOverride: z.boolean().optional(),
        })).max(100),
      }).safeParse(req.body ?? {});
      if (!body.success) {
        res.status(400).json({ message: "results must be an array", errors: body.error.issues });
        return;
      }
      const vote = await storage.getEventVoteWithDetails(req.params.voteId);
      if (!vote) {
        res.status(404).json({ message: "Vote not found" });
        return;
      }
      const event = await storage.getEventWithDetails(vote.eventId);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      const categoryIds = new Set(event.votingCategories.map((c) => c.id));
      const regIds = new Set(event.registrations.map((r) => r.id));
      for (const r of body.data.results) {
        if (!categoryIds.has(r.votingCategoryId) || !regIds.has(r.winnerRegistrationId)) {
          res.status(400).json({ message: "Results must reference this event's categories and registrations" });
          return;
        }
      }

      const savedResults = await storage.setVoteResults(
        req.params.voteId,
        body.data.results.map((r) => ({
          votingCategoryId: r.votingCategoryId,
          winnerRegistrationId: r.winnerRegistrationId,
          voteCount: r.voteCount ?? 0,
          isOverride: r.isOverride ?? false,
        }))
      );

      res.json(savedResults);
    } catch (error) {
      console.error("Error setting vote results:", error);
      res.status(500).json({ message: "Failed to set results" });
    }
  });

  // Get published results for an event
  app.get("/api/events/:id/results", isAuthenticated, async (req, res) => {
    try {
      const eventVote = await storage.getEventVoteByEvent(req.params.id);
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

  app.get("/api/events/:id/racing-awards", isAuthenticated, async (req: any, res) => {
    try {
      const awards = await storage.getRacingAwardsWithResults(req.params.id);
      if (req.user?.isAdmin) {
        res.json(awards);
        return;
      }
      // Non-admins only learn about winners once results are published
      res.json(awards.map((a) => ({ ...a, result: a.result?.published ? a.result : null })));
    } catch (error) {
      console.error("Error fetching racing awards:", error);
      res.status(500).json({ message: "Failed to fetch racing awards" });
    }
  });

  app.post("/api/racing-awards", isAdmin, async (req, res) => {
    try {
      const parsed = insertRacingAwardSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid racing award data", errors: parsed.error.issues });
        return;
      }
      const award = await storage.createRacingAward(parsed.data);
      res.status(201).json(award);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        res.status(400).json({ message: "Event not found" });
        return;
      }
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
      const winnerId = idParam.safeParse(req.body?.winnerRegistrationId);
      if (!winnerId.success) {
        res.status(400).json({ message: "winnerRegistrationId is required" });
        return;
      }
      const award = await storage.getRacingAward(req.params.id);
      if (!award) {
        res.status(404).json({ message: "Racing award not found" });
        return;
      }
      const winner = await storage.getRegistration(winnerId.data);
      if (!winner || winner.eventId !== award.eventId) {
        res.status(400).json({ message: "Winner must be a registration for this event" });
        return;
      }
      const result = await storage.setRacingAwardResult(req.params.id, winnerId.data);
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
      const { published } = req.body ?? {};
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
      const event = await storage.getEventWithDetails(req.params.id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      const registrations = event.registrations || [];

      const exportsBaseDir = path.join(process.cwd(), "exports");
      fs.mkdirSync(exportsBaseDir, { recursive: true });
      exportDir = fs.mkdtempSync(path.join(exportsBaseDir, "export-"));
      const photosDir = path.join(exportDir, "photos");
      const participantPhotosDir = path.join(photosDir, "participants");
      const carPhotosDir = path.join(photosDir, "cars");
      fs.mkdirSync(participantPhotosDir, { recursive: true });
      fs.mkdirSync(carPhotosDir, { recursive: true });

      const sanitizeFilename = (name: string): string =>
        name.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").toLowerCase();

      const parseName = (fullName: string): { firstName: string; lastName: string } => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return { firstName: parts[0], lastName: "" };
        const lastName = parts.pop() || "";
        return { firstName: parts.join(" "), lastName };
      };

      const safeGetUploadPath = (pictureUrl: string | null): string | null => {
        const p = uploadUrlToPath(pictureUrl);
        return p && fs.existsSync(p) ? p : null;
      };

      // Quote for CSV and neutralise spreadsheet formula injection (=, +, -, @, tab, CR)
      const escapeCSV = (field: string) => {
        let value = field;
        if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
        if (/[",\n\r]/.test(value)) value = `"${value.replace(/"/g, '""')}"`;
        return value;
      };

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
        // Car number keeps filenames unique when two participants share a name
        const baseName = sanitizeFilename(reg.participantName) || `participant_${i + 1}`;
        const safeName = carNumber ? `${baseName}_${carNumber}` : `${baseName}_${i + 1}`;

        let participantPhotoPath = "";
        let carPhotoPath = "";

        const participantSourcePath = safeGetUploadPath(reg.participantPictureUrl);
        if (participantSourcePath) {
          const destFilename = `${safeName}${path.extname(participantSourcePath)}`;
          fs.copyFileSync(participantSourcePath, path.join(participantPhotosDir, destFilename));
          participantPhotoPath = `photos/participants/${destFilename}`;
        }

        const carSourcePath = safeGetUploadPath(reg.carPictureUrl);
        if (carSourcePath) {
          const destFilename = `${safeName}_car${path.extname(carSourcePath)}`;
          fs.copyFileSync(carSourcePath, path.join(carPhotosDir, destFilename));
          carPhotoPath = `photos/cars/${destFilename}`;
        }

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

      fs.writeFileSync(path.join(exportDir, "roster.csv"), csvRows.join("\n"));

      const eventName = sanitizeFilename(event.name) || "derby_event";
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${eventName}_roster.zip"`);

      // Clean up whether the download completes or the client goes away
      const dirToClean = exportDir;
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        fs.rm(dirToClean, { recursive: true, force: true }, (e) => {
          if (e) console.error("Failed to clean up export directory:", e);
        });
      };
      res.on("finish", cleanup);
      res.on("close", cleanup);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        res.destroy(err);
      });
      archive.pipe(res);
      archive.directory(exportDir, false);
      await archive.finalize();
    } catch (error) {
      console.error("Error exporting registrations:", error);
      if (exportDir) {
        fs.rm(exportDir, { recursive: true, force: true }, () => {});
      }
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to export registrations" });
      } else {
        res.destroy();
      }
    }
  });

  // Error handling middleware for multer and other errors
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
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

    if (err?.message === 'Only image files are allowed') {
      return res.status(400).json({
        message: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
      });
    }

    next(err);
  });

  return httpServer;
}
