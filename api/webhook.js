export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log("📩 Notificación recibida:", req.body);

    const { data } = req.body || {};
    const id = data?.id;

    if (!id) {
      return res.status(400).json({ error: "Falta el data.id en la notificación" });
    }

    // Consultar a Mercado Pago el detalle del pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_TOKEN}` },
    });

    let info = await mpRes.json();

    if (!mpRes.ok) {
      console.warn("⚠️ Consulta MP no OK:", mpRes.status, info);
      info = { lookup: "failed", status: mpRes.status, body: info };
    } else {
      console.log("✅ Detalle del pago/suscripción:", info);
    }

    return res.status(200).json({ message: "Notificación procesada", data: info });
  } catch (err) {
    console.error("❌ Error procesando webhook:", err);
    return res.status(500).json({ error: "Error procesando webhook" });
  }
}
