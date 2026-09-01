import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

console.log("🚀 Starting GestãoEdu Server...");
console.log(`📂 Working Directory: ${process.cwd()}`);
console.log(`🌍 Node Environment: ${process.env.NODE_ENV || 'development'}`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check route - MUST be first
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV 
    });
  });

  let stripe: Stripe | null = null;
  const getStripe = () => {
    if (!stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        console.warn("⚠️ STRIPE_SECRET_KEY not found. Stripe features disabled.");
        return null;
      }
      stripe = new Stripe(key, {
        apiVersion: "2025-01-27.acacia" as any,
      });
    }
    return stripe;
  };

  app.use(express.json());

  // Combined Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    const { type, userId, ...data } = req.body;
    const stripeInstance = getStripe();

    if (!stripeInstance) {
      return res.status(500).json({ error: "Stripe is not configured." });
    }

    try {
      let sessionConfig: any = {
        payment_method_types: ["card"],
        metadata: {
          userId,
          type,
        },
      };

      if (type === "pack_purchase") {
        const { packId, packTitle, packPrice } = data;
        sessionConfig = {
          ...sessionConfig,
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: {
                  name: packTitle,
                  description: `Pacote de Flashcards: ${packTitle}`,
                },
                unit_amount: Math.round(packPrice * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${req.headers.origin}/marketplace?success=true&packId=${packId}`,
          cancel_url: `${req.headers.origin}/marketplace?canceled=true`,
        };
        sessionConfig.metadata.packId = packId;
      } else if (type === "pack_purchase_bulk") {
        const { packs } = data;
        sessionConfig = {
          ...sessionConfig,
          line_items: packs.map((p: any) => ({
            price_data: {
              currency: "brl",
              product_data: {
                name: p.title,
                description: `Pacote de Flashcards: ${p.title}`,
              },
              unit_amount: Math.round(p.price * 100),
            },
            quantity: 1,
          })),
          mode: "payment",
          success_url: `${req.headers.origin}/marketplace?success=true&bulk=true&packIds=${encodeURIComponent(JSON.stringify(packs.map((p: any) => p.id)))}`,
          cancel_url: `${req.headers.origin}/marketplace?canceled=true`,
        };
        sessionConfig.metadata.packIds = JSON.stringify(packs.map((p: any) => p.id));
      } else if (type === "subscription_upgrade") {
        const { planId, planName, planPrice } = data;
        sessionConfig = {
          ...sessionConfig,
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: {
                  name: `Plano ${planName}`,
                  description: `Assinatura GestãoEdu: ${planName}`,
                },
                unit_amount: Math.round(planPrice * 100),
                recurring: {
                  interval: "month",
                },
              },
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${req.headers.origin}/pricing?success=true&planId=${planId}`,
          cancel_url: `${req.headers.origin}/pricing?canceled=true`,
        };
        sessionConfig.metadata.planId = planId;
      } else {
        return res.status(400).json({ error: "Invalid checkout type." });
      }

      const session = await stripeInstance.checkout.sessions.create(sessionConfig);
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Running in DEVELOPMENT mode with Vite middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`📦 Running in PRODUCTION mode serving from: ${distPath}`);
    
    app.use(express.static(distPath, {
      maxAge: '1d',
      immutable: true,
      etag: true
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ SERVER ERROR:', err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server is listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("❌ CRITICAL: Failed to start server:", err);
  process.exit(1);
});
