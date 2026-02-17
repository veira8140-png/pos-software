
import { GoogleGenAI } from "@google/genai";
import { Sale, Product, Staff, ActivityLog } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailySummary = async (sales: Sale[], products: Product[], businessName: string) => {
  const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
  const transactionCount = sales.length;
  
  const productMap: Record<string, number> = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      productMap[item.name] = (productMap[item.name] || 0) + item.quantity;
    });
  });
  
  const topProduct = Object.entries(productMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const prompt = `
    You are an AI assistant for a retail business in Kenya called ${businessName}. 
    Today's sales data:
    - Total Sales: KES ${totalSales}
    - Transactions: ${transactionCount}
    - Top Selling Product: ${topProduct}

    Generate a professional yet friendly WhatsApp summary message for the business owner. 
    Include emojis and keep it concise. Mention it is the "Veira Daily Summary".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    return `Veira Daily Summary for ${businessName}:\nTotal: KES ${totalSales}\nTransactions: ${transactionCount}\nTop Product: ${topProduct}`;
  }
};

export const veiraChat = async (
  message: string, 
  history: {role: 'user' | 'model', text: string}[],
  context: {
    sales: Sale[],
    products: Product[],
    logs: ActivityLog[],
    staff: Staff[],
    businessName: string
  }
) => {
  const systemInstruction = `
    You are "Veira Assistant", an AI helper inside the Veira POS system for ${context.businessName}.
    Your role is to guide staff, managers, and accountants in operating the POS efficiently and ensuring ETIMS compliance. 
    You only provide actionable and concise responses.

    CURRENT STORE CONTEXT:
    - Products: ${JSON.stringify(context.products.map(p => ({name: p.name, stock: p.stock, price: p.price})))}
    - Sales Today: ${JSON.stringify(context.sales.slice(0, 10).map(s => ({id: s.id, total: s.total, status: s.status, staff: s.staffName})))}
    - Recent Logs: ${JSON.stringify(context.logs.slice(0, 5).map(l => l.details))}

    TASKS:
    1. Transaction Assistance: Verify ETIMS compliance (mocked in this system via KRA control numbers).
    2. Reports & Summaries: Generate daily/weekly insights.
    3. Inventory Guidance: Suggest replenishment based on stock levels.
    4. Compliance Checks: Check if sales have control numbers.
    5. Staff Support: Help with POS operations.

    RULES:
    - Keep answers short, clear, and actionable.
    - No unrelated advice.
    - Use simple language.
    - Reference the provided CURRENT STORE CONTEXT data.
  `;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction,
      }
    });

    // Convert history format if needed, but for generateContent we can just send the latest with history context
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{text: h.text}] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "I'm having trouble connecting to my brain. Please try again in a moment.";
  }
};
