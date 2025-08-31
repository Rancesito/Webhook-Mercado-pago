import express from "express";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =====================
// 📌 Configuración de rutas absolutas (para que siempre lea bien firebase-key.json)
// =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================
// 🔑 Inicializar Mercado Pago
// =====================
const client = new MercadoPagoConfig({
  accessToken: "TU_ACCESS_TOKEN_REAL", // ⚠️ pon aquí tu token de MP (TEST primero)
});
const mpPreference = new Preference(client);
const mpPayment = new Payment(client);

// =====================
// 🔥 Inicializar Firebase Admin
// =====================
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, "firebase-key.json"), "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// =====================
// 🚀 Inicializar Express
// =====================
const app = express();
app.use(express.json());

// =====================
// 🛒 Crear preferencia de pago
// =====================
app.post("/create-preference", async (req, res) => {
  try {
    const { userId } = req.body; // viene desde el frontend

    const preference = await mpPreference.create({
      body: {
        items: [
          {
            title: "Suscripción Premium",
            quantity: 1,
            unit_price: 100, // 💲 precio en pesos mexicanos (ejemplo)
          },
        ],
        back_urls: {
          success: "http://localhost:3000/success",
          failure: "http://localhost:3000/failure",
        },
        auto_return: "approved",
        metadata: {
          userId: userId, // 🔑 aquí viaja el UID del usuario
        },
      },
    });

    res.json({
      id: preference.id,
      init_point: preference.init_point, // URL de pago
    });
  } catch (error) {
    console.error("❌ Error creando preferencia:", error);
    res.status(500).json({ error: "No se pudo crear la preferencia" });
  }
});

// =====================
// 📌 Webhook (donde Mercado Pago notificará)
// =====================
app.post("/webhook", async (req, res) => {
  try {
    const payment = req.body;

    if (payment.type === "payment") {
      const paymentData = await mpPayment.get({ id: payment.data.id });

      if (paymentData.status === 200 && paymentData.body.status === "approved") {
        const userId = paymentData.body.metadata?.userId ?? null;

        if (userId) {
          await db.collection("users").doc(userId).update({
            plan: "premium",
            lastPayment: new Date(),
          });
          console.log("✅ Usuario actualizado en Firebase:", userId);
        } else {
          console.warn("⚠️ Pago aprobado pero sin userId en metadata");
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    res.sendStatus(500);
  }
});

// =====================
// ▶️ Iniciar servidor
// =====================
app.listen(3000, () => {
  console.log("🚀 Servidor escuchando en http://localhost:3000");
});
