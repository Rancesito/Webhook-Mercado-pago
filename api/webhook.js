export default function handler(req, res) {
  if (req.method === "POST") {
    console.log("Webhook recibido:", req.body);

    // Responder a Mercado Pago que recibiste el evento
    return res.status(200).json({ message: "Notificación recibida" });
  }

  // Si el método no es POST, rechazar
  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
