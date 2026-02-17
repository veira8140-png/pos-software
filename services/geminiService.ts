
import { GoogleGenAI } from "@google/genai";
import { Sale, Product } from "../types";

// Always use the recommended initialization with the API key from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailySummary = async (sales: Sale[], products: Product[], businessName: string) => {
  const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
  const transactionCount = sales.length;
  
  // Calculate top product
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
    // Generate content using the recommended ai.models.generateContent call
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access the .text property directly
    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    return `Veira Daily Summary for ${businessName}:\nTotal: KES ${totalSales}\nTransactions: ${transactionCount}\nTop Product: ${topProduct}`;
  }
};
