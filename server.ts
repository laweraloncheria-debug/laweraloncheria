import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const products = [
  { id: '1', name: 'Tortas', price: 40 },
  { id: '2', name: 'Sándwiches', price: 40 },
  { id: '3', name: 'Tacos (Pollo Asado)', price: 15 },
  { id: '4', name: 'Chilaquiles', price: 45 },
  { id: '5', name: 'Uvas', price: 35 },
  { id: '6', name: 'Manzanas', price: 30 },
  { id: '7', name: 'Fresas', price: 15 },
  { id: '8', name: 'Electrolit', price: 25 },
  { id: '9', name: 'Agua Lt (Sabor)', price: 17 },
  { id: '9-2', name: 'Agua Lt (Natural)', price: 15 },
  { id: '10', name: 'Agua ch. (Sabor)', price: 13 },
  { id: '10-2', name: 'Agua ch. (Natural)', price: 10 }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // AI Chat Route
  app.post("/api/chat", async (req, res) => {
    const { messages, userText } = req.body;
    
    try {
      const systemPrompt = `Eres "La Wera", la asistente virtual y alma de "Antojos", la lonchería más honesta de Tacámbaro. 
      Tu tono es alegre, servicial, muy mexicano y cercano. 
      
      CONOCIMIENTO:
      - Menú: ${products.map(p => `${p.name} ($${p.price})`).join(', ')}.
      - Ubicación: Eduardo Gorostiza #3, Colonia Centro, Tacámbaro, Michoacán.
      - Horario: Lunes a Sábado, de 9:00 AM a 6:00 PM (Aproximadamente).
      - Especialidad: El sazón casero y los ingredientes frescos.
      
      REGLAS DE ORO:
      1. SÉ NATURAL: Saluda como "¡Hola! Qué gusto saludarte" o "¿Qué se te antoja hoy?".
      2. RECOGER EN TIENDA: Somos un punto de entrega rápida. No tenemos repartidores propios. Todo se recoge en local.
      3. PEDIDOS: Si el usuario quiere ordenar algo específico, ayúdale a decidir y recuérdale que puede agregarlo a su carrito en la app para enviarlo por WhatsApp.
      4. BREVEDAD: Responde en párrafos cortos. No satures al cliente.
      5. FORMATO SEGURO: Jamás uses negritas con asteriscos (**), listas con guiones raros o emojis en exceso (uno o dos están bien).
      6. SIEMPRE EN ESPAÑOL.
      7. LA WERA: La Wera es la dueña y tú eres su extensión digital. Hablas en su nombre con orgullo.`;

      const geminiMessages = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Start chat with history
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: systemPrompt,
        },
        history: geminiMessages.slice(0, -1) // All except current which we send next
      });

      const response = await chat.sendMessage({ message: userText });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
