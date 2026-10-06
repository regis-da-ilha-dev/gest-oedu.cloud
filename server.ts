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

  // Health check route - MUST be first and respond immediately
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
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

  // Automated Top 5 Featured Concursos Fetch Endpoint
  app.get("/api/concursos/destaques-online", async (req, res) => {
    const CURATED_TOP_CONCURSOS = [
      {
        title: "Polícia Federal — Agente e Escrivão",
        institution: "Polícia Federal",
        banca: "Cebraspe",
        status: "Edital Publicado",
        vagas: "2.000 vagas",
        remuneracao: "R$ 13.600,00",
        escolaridade: "Nível Superior",
        dataProva: "Prevista no cronograma",
        inscricaoPeriodo: "Consulte o portal oficial",
        editalUrl: "https://www.gov.br/pf/pt-br",
        description: "Concurso público para provimento de vagas no cargo de Agente e Escrivão da Polícia Federal com remuneração inicial atrativa.",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/2830/2830284.png",
        tags: ["Polícia Federal", "Segurança Pública", "Nacional"]
      },
      {
        title: "Polícia Rodoviária Federal — Policial Rodoviário",
        institution: "PRF",
        banca: "Cebraspe",
        status: "Inscrições Abertas",
        vagas: "1.500 vagas",
        remuneracao: "R$ 10.758,41",
        escolaridade: "Nível Superior",
        dataProva: "Consulte o edital",
        inscricaoPeriodo: "Consulte o cronograma",
        editalUrl: "https://www.gov.br/prf/pt-br",
        description: "Carreira de Policial Rodoviário Federal com abrangência nacional, plano de carreira consolidado e benefícios.",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/921/921591.png",
        tags: ["PRF", "Policial", "Nacional"]
      },
      {
        title: "Receita Federal do Brasil — Auditor e Analista",
        institution: "Receita Federal",
        banca: "FGV",
        status: "Edital Publicado",
        vagas: "699 vagas",
        remuneracao: "R$ 21.029,09",
        escolaridade: "Nível Superior",
        dataProva: "Consulte cronograma",
        inscricaoPeriodo: "Consulte o edital",
        editalUrl: "https://www.gov.br/receitafederal/pt-br",
        description: "Oportunidades fiscais para Auditor-Fiscal e Analista-Tributário com excelente remuneração na administração pública.",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/2830/2830305.png",
        tags: ["Receita Federal", "Fiscal", "Nacional"]
      },
      {
        title: "INSS — Técnico do Seguro Social",
        institution: "INSS",
        banca: "Cebraspe",
        status: "Inscrições Abertas",
        vagas: "1.000 vagas",
        remuneracao: "R$ 5.905,79",
        escolaridade: "Nível Médio",
        dataProva: "Consulte cronograma",
        inscricaoPeriodo: "Consulte o edital",
        editalUrl: "https://www.gov.br/inss/pt-br",
        description: "Concurso nacional para o cargo de Técnico do Seguro Social em agências de todo o país, exigindo nível médio.",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        tags: ["INSS", "Previdenciário", "Nível Médio"]
      },
      {
        title: "Caixa Econômica Federal — Técnico Bancário Novo",
        institution: "Caixa Econômica",
        banca: "Cesgranrio",
        status: "Edital Publicado",
        vagas: "4.000 vagas",
        remuneracao: "R$ 3.762,00 + Benefícios",
        escolaridade: "Nível Médio",
        dataProva: "Consulte cronograma",
        inscricaoPeriodo: "Consulte o edital",
        editalUrl: "https://www.caixa.gov.br",
        description: "Carreira bancária de abrangência nacional na Caixa com participação nos lucros, plano de saúde e auxílio alimentação.",
        imageUrl: "https://cdn-icons-png.flaticon.com/512/2830/2830289.png",
        tags: ["Caixa", "Bancário", "Nível Médio"]
      }
    ];

    try {
      const list: any[] = [];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      try {
        const response = await fetch("https://www.pciconcursos.com.br/concursos/nacional/", {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }
        });

        if (response.ok) {
          const html = await response.text();
          const parts = html.split("<div class=\"ca\">").slice(1);

          for (const part of parts) {
            if (list.length >= 5) break;
            const end = part.indexOf("<div class=\"clear\"></div></div>");
            const block = end !== -1 ? part.slice(0, end) : part;

            const linkMatch = block.match(/<a\s+[^>]*href="([^"]+)"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i) ||
                              block.match(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
            const imgMatch = block.match(/data-src="([^"]+)"/i) || block.match(/src="([^"]+)"/i);
            const cdMatch = block.match(/<div class="cd">([\s\S]*?)<\/div>/i);
            const ceMatch = block.match(/<div class="ce">([\s\S]*?)<\/div>/i);

            if (!linkMatch) continue;
            const editalUrl = linkMatch[1];
            const rawTitle = linkMatch[2] || "";
            const rawInst = linkMatch[3] ? linkMatch[3].replace(/<[^>]*>/g, "").trim() : "";
            
            const details = cdMatch ? cdMatch[1] : "";
            const deadline = ceMatch ? ceMatch[1].replace(/<[^>]*>/g, "").trim() : "";
            const rawImg = imgMatch ? imgMatch[1] : "";
            const imageUrl = rawImg && !rawImg.startsWith("data:") ? rawImg : "";

            const detailLines = details.split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
            const vagasSalario = detailLines[0] || "Vagas a definir";
            
            let remuneracao = "Consulte o edital";
            let vagas = vagasSalario;
            const salMatch = vagasSalario.match(/R\$\s*[\d.,]+/i);
            if (salMatch) remuneracao = "Até " + salMatch[0];
            if (vagasSalario.toLowerCase().includes("vagas") || vagasSalario.toLowerCase().includes("vaga") || vagasSalario.toLowerCase().includes("reserva")) {
              vagas = vagasSalario.replace(/até\s*R\$.*$/i, "").trim() || vagasSalario;
            }

            const cargo = detailLines[1] || "";
            let escolaridade = "Nível Médio / Superior";
            if (details.includes("Superior")) escolaridade = "Nível Superior";
            else if (details.includes("Médio")) escolaridade = "Nível Médio";

            const instClean = rawInst.split(" - ")[0] || rawInst || "Órgão Nacional";
            const titleClean = rawTitle || rawInst;

            list.push({
              title: titleClean,
              institution: instClean,
              banca: "Consulte o Edital",
              status: deadline ? "Inscrições Abertas" : "Edital Publicado",
              vagas: vagas || "Vagas Imediatas + CR",
              remuneracao: remuneracao || "A definir",
              escolaridade: escolaridade,
              dataProva: deadline ? `Inscrições até ${deadline}` : "Consulte cronograma",
              inscricaoPeriodo: deadline ? `Até ${deadline}` : "Consulte o edital",
              editalUrl: editalUrl,
              isFeatured: true,
              featuredOrder: list.length + 1,
              description: `${titleClean}. ${cargo ? "Oportunidades para " + cargo + "." : ""} ${vagasSalario}.`,
              imageUrl: imageUrl || "https://cdn-icons-png.flaticon.com/512/2830/2830284.png",
              tags: [instClean, escolaridade, "Nacional"],
              isManual: false,
              sourceUrl: "https://www.pciconcursos.com.br/concursos/nacional/"
            });
          }
        }
      } catch (fetchErr: any) {
        console.warn("⚠️ Aviso ao buscar online via portal:", fetchErr.message);
      } finally {
        clearTimeout(timeout);
      }

      // If we got fewer than 5 from the live scraper, backfill with curated top national concursos
      let fallbackIndex = 0;
      while (list.length < 5 && fallbackIndex < CURATED_TOP_CONCURSOS.length) {
        const fallbackItem = CURATED_TOP_CONCURSOS[fallbackIndex];
        const alreadyExists = list.some(item => item.title.toLowerCase().includes(fallbackItem.institution.toLowerCase()));
        if (!alreadyExists) {
          list.push({
            ...fallbackItem,
            isFeatured: true,
            featuredOrder: list.length + 1,
            isManual: false,
            sourceUrl: "https://www.gov.br"
          });
        }
        fallbackIndex++;
      }

      res.json({
        success: true,
        count: list.length,
        source: list.length > 0 && list[0].sourceUrl?.includes("pciconcursos") ? "portal_online" : "curated_top",
        concursos: list.slice(0, 5)
      });
    } catch (err: any) {
      console.error("Erro no endpoint de destaques:", err);
      res.status(500).json({ error: "Erro ao buscar destaques", details: err.message });
    }
  });

  // Vite / static middleware setup
  let viteMiddleware: express.Handler | null = null;
  let viteReadyPromise: Promise<void> | null = null;

  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Running in DEVELOPMENT mode with Vite middleware");
    viteReadyPromise = createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      viteMiddleware = vite.middlewares;
      console.log("⚡ Vite dev server initialized and ready.");
    }).catch((err) => {
      console.error("❌ Failed to initialize Vite dev server:", err);
    });

    app.use(async (req, res, next) => {
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      if (viteReadyPromise) {
        try {
          await viteReadyPromise;
          if (viteMiddleware) {
            return viteMiddleware(req, res, next);
          }
        } catch (e) {
          return next(e);
        }
      }
      next();
    });
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

  // Start listening immediately on 0.0.0.0:3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server is listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("❌ CRITICAL: Failed to start server:", err);
  process.exit(1);
});
