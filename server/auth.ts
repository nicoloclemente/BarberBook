import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Verifica se la password è in formato bcrypt (inizia con $2a$, $2b$ o $2y$)
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    // Usa bcrypt per confrontare
    return bcrypt.compare(supplied, stored);
  } else {
    // Controlla se la password è nel formato di scrypt (hash.salt)
    if (stored.includes('.')) {
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    }
    // Se non è né bcrypt né scrypt, la password non può essere verificata
    throw new Error("Unsupported password format");
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "barber-app-secret-key";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      // Prendiamo tutti i dati di registrazione
      const registrationData = req.body;
      
      // Verifichiamo se c'è il campo barberType
      let isApproved = false;
      
      // Se è barbiere, impostiamo i valori in base al tipo di barbiere
      if (registrationData.isBarber) {
        if (registrationData.barberType === "independent") {
          // Barbiere indipendente: richiede approvazione admin
          isApproved = false;
        } else if (registrationData.barberType === "employee") {
          // Barbiere dipendente: non richiede approvazione dell'admin
          // (sarà il manager a collegarlo come dipendente)
          isApproved = true;
        }
      }
      
      // Rimuoviamo barberType che non fa parte dello schema del database
      const { barberType, ...userData } = registrationData;
      
      // Validazione dei dati con Zod
      const validatedData = insertUserSchema.parse(userData);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
        // Impostiamo isApproved in base al tipo di barbiere se è un barbiere
        ...(validatedData.isBarber && { isApproved }),
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return res.status(500).json({ error: "Login failed after registration" });
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed: " + (error instanceof Error ? error.message : String(error)) });
      }
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    // Modifica: ritorniamo null invece di un errore 401 se l'utente non è autenticato
    // Questo facilita la gestione nel frontend
    if (!req.isAuthenticated() || !req.user) {
      // Ritorna un 200 con dati vuoti invece di un 401
      return res.json(null);
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
  
  // Aggiungiamo un endpoint alias per /api/me che fa la stessa cosa di /api/user
  // Questo è necessario perché alcune pagine usano /api/me e altre /api/user
  app.get("/api/me", (req, res) => {
    // Stesso comportamento di /api/user
    if (!req.isAuthenticated() || !req.user) {
      return res.json(null);
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
  
  // Aggiungiamo anche PUT /api/me per aggiornare i dati utente
  app.put("/api/me", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      // Aggiorniamo i dati dell'utente corrente
      const updatedUser = await storage.updateUser(req.user!.id, req.body);
      
      // Rimuovi la password prima di ritornare
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
}
