import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

export function getSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required for session management");
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn("Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: "/api/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const user = await authStorage.upsertUser({
            id: profile.id,
            email: email || null,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            name: profile.displayName || email || "User",
          });
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await authStorage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  // Store invite token in session before redirecting to Google
  app.get("/api/login", (req, res, next) => {
    const inviteToken = req.query.invite;
    if (typeof inviteToken === "string" && /^[a-f0-9]{64}$/.test(inviteToken)) {
      (req.session as any).inviteToken = inviteToken;
    }
    passport.authenticate("google")(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", async (err: any, user: any, info: any) => {
        if (err || !user) {
          return res.redirect("/api/login");
        }
        
        // Check if there was an invite token in the session
        const inviteToken = (req.session as any).inviteToken;
        delete (req.session as any).inviteToken;
        
        let finalUser = user;
        
        if (inviteToken) {
          // Validate the invite token
          const isValidInvite = await authStorage.validateInviteToken(inviteToken);
          if (isValidInvite) {
            // Re-upsert user with invite flag if they're a new user or still pending
            // This won't change disabled users because upsertUser preserves existing status
            const existingUser = await authStorage.getUser(user.id);
            if (!existingUser || existingUser.accessStatus === "pending") {
              const updatedUser = await authStorage.upsertUser({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImageUrl: user.profileImageUrl,
                name: user.name,
              }, true);
              finalUser = updatedUser;
            }
          }
        }
        
        req.login(finalUser, (loginErr) => {
          if (loginErr) {
            return res.redirect("/api/login");
          }
          return res.redirect("/");
        });
      })(req, res, next);
    }
  );

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.status(204).end();
      });
    });
  });
}

// A request is "active" only when it carries a valid session AND the user's
// access status is active. Pending and disabled accounts can still sign in
// (so the client can show them the right screen) but may not use the API.
function activeUser(req: Parameters<RequestHandler>[0]): any | null {
  if (!req.isAuthenticated() || !req.user) return null;
  const user = req.user as any;
  if (user.accessStatus !== "active") return null;
  return user;
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (!activeUser(req)) {
    res.status(403).json({ message: "Forbidden: account is not active" });
    return;
  }
  next();
};

export const isAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const user = activeUser(req);
  if (!user || !user.isAdmin) {
    res.status(403).json({ message: "Forbidden: Admin access required" });
    return;
  }
  next();
};
