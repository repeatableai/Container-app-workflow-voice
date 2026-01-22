import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Intercept callback immediately to prevent window closing
  app.get("/api/callback", (req, res) => {
    // Immediately send a page that prevents closing BEFORE passport processes
    // This intercepts Replit's redirect and prevents window.close()
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Processing authentication...</title>
          <script>
            // CRITICAL: Prevent window closing IMMEDIATELY
            (function() {
              const preventClose = function() {
                window.close = function() {
                  console.log('Window close prevented');
                  return false;
                };
                if (window.self && window.self.close) {
                  window.self.close = function() { return false; };
                }
              };
              preventClose();
              // Keep preventing it
              setInterval(preventClose, 100);
            })();
            
            // Now redirect to the actual passport callback handler
            // Pass all query parameters
            const params = new URLSearchParams(window.location.search);
            window.location.replace('/api/callback-handler?' + params.toString());
          </script>
        </head>
        <body>
          <p>Processing authentication...</p>
        </body>
      </html>
    `);
  });

  // Handler for the actual passport authentication
  app.get("/api/callback-handler", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/auth-success",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Custom success handler that ensures window stays open and syncs auth state
  app.get("/auth-success", (req, res) => {
    // Check if user is authenticated
    if (req.isAuthenticated()) {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Successful</title>
            <script>
              // Notify other tabs/windows that auth succeeded
              try {
                localStorage.setItem('replit_auth_success', Date.now().toString());
                // Trigger storage event manually for same-tab listeners
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'replit_auth_success',
                  newValue: Date.now().toString(),
                  storageArea: localStorage
                }));
              } catch (e) {
                console.log('LocalStorage not available:', e);
              }
              
              // Prevent closing
              window.close = function() { return false; };
              if (window.self) window.self.close = function() { return false; };
              
              // If opened from another window, communicate back
              if (window.opener) {
                try {
                  window.opener.postMessage({ 
                    type: 'REPLIT_AUTH_SUCCESS',
                    timestamp: Date.now()
                  }, '*');
                } catch (e) {
                  console.log('PostMessage error:', e);
                }
              }
              
              // Redirect immediately using replace (prevents back button issues)
              window.location.replace('/');
            </script>
          </head>
          <body>
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
              <div style="text-align: center;">
                <h1>Authentication Successful!</h1>
                <p>Redirecting to your app...</p>
              </div>
            </div>
          </body>
        </html>
      `);
    } else {
      res.redirect("/api/login");
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
