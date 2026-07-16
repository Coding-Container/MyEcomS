const ai = require("./gemini");

const classifyIntent = async (message) => {
  const prompt = `
You are an AI assistant for MyEcomS.

Return ONLY valid JSON.

Available intents:
- PRODUCT_SEARCH
- ORDER_STATUS
- ADD_TO_CART
- REMOVE_FROM_CART
- GENERAL

Extract these fields:
intent
category
brand
minPrice
maxPrice
productName

User Message:
${message}

Return only JSON.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text.trim();

  const cleanedResponse = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleanedResponse);
};

module.exports = classifyIntent;
