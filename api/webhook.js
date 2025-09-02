import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Configuración de Firebase desde la variable de entorno
const firebaseConfig = JSON.parse(process.env.FIREBASE_KEY);

// Inicializar Firebase solo una vez
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log("📩 Notificación recibida:", req.body);

    const data = req.body || {};
    const id = data?.id;

    if (!id) {
      return res.status(400).json({ error: "Falta el data.id en la notificación" });
    }

    // Consultar a Mercado Pago para obtener los detalles del pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_TOKEN}`,
      },
    });

    const info = await mpRes.json();

    if (!mpRes.ok) {
      console.error("❌ Error consultando a Mercado Pago:", info);
      return res.status(500).json({ error: "Error consultando a Mercado Pago", info });
    }

    console.log("✅ Detalle del pago:", info);

    // Guardar en Firebase
    await setDoc(doc(db, "pagos", id.toString()), {
      id,
      status: info.status,
      status_detail: info.status_detail,
      payer: info.payer,
      transaction_amount: info.transaction_amount,
      payment_type: info.payment_type_id,
      date_created: info.date_created,
      date_approved: info.date_approved,
      raw: info, // Guardamos todo por si acaso
    });

    return res.status(200).json({ message: "Notificación procesada y guardada", data: info });
  } catch (err) {
    console.error("⚠️ Error en webhook:", err);
    return res.status(500).json({ error: "Error interno en webhook" });
  }
}

