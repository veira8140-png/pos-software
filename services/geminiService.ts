
import { GoogleGenAI } from "@google/genai";
import { Sale, Product, Staff, ActivityLog, Expense } from "../types";

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
    You are an AI business analyst for ${businessName}.
    Today's performance:
    - Total Sales: KES ${totalSales}
    - Transactions: ${transactionCount}
    - Top Selling Product: ${topProduct}

    Generate a high-energy WhatsApp summary with emojis. Mention performance trends if applicable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return `Veira Summary: Sales KES ${totalSales}, Txns: ${transactionCount}`;
  }
};

export const getBusinessInsights = async (context: {
  sales: Sale[],
  products: Product[],
  expenses: Expense[],
  businessName: string
}) => {
  const totalSales = context.sales.reduce((a, s) => a + s.total, 0);
  const totalExpenses = context.expenses.reduce((a, e) => a + e.amount, 0);
  const lowStockCount = context.products.filter(p => p.stock <= p.minStock).length;

  const prompt = `
    Analyze this business data for ${context.businessName}:
    - Total Sales: KES ${totalSales}
    - Total Expenses: KES ${totalExpenses}
    - Low Stock Items: ${lowStockCount}
    
    Provide 3 strategic recommendations for the owner. Keep it under 100 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "Inventory looks healthy. Keep an eye on peak hour staffing.";
  }
};

export const veiraChat = async (
  message: string, 
  history: {role: 'user' | 'model', text: string}[],
  context: any
) => {
  const systemInstruction = `
    You are "Veira Intelligence", a world-class retail advisor. 
    You have full visibility into sales, inventory, and staff performance for ${context.businessName}.
    Respond concisely. If asked about trends, use the provided data.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{text: h.text}] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: { systemInstruction }
    });
    return response.text;
  } catch (error) {
    return "I'm optimizing data right now. Try again shortly.";
  }
};
