import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { app } from 'electron';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AgentStepPlan {
  id: number;
  title: string;
  tool: 'web_search' | 'scrape_webpage' | 'system_control' | 'document_read' | 'document_write' | 'generate_image' | 'memory_save' | 'finalize_report';
  params: Record<string, any>;
  description: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentApiKey: string = '';
  private verifiedModel: string = 'gemini-2.0-flash';

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(key: string) {
    this.currentApiKey = key;
    if (key.trim()) {
      this.genAI = new GoogleGenerativeAI(key.trim());
    } else {
      this.genAI = null;
    }
  }

  getApiKey(): string {
    return this.currentApiKey;
  }

  /**
   * Test API key validity with dynamic model discovery and user-selected model priority
   */
  async testConnection(apiKey: string, modelName: string = 'gemini-3.1-flash-lite'): Promise<{ success: boolean; message: string }> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { success: false, message: 'Please provide a valid Gemini API Key.' };
    }

    const preferredModel = modelName || 'gemini-3.1-flash-lite';
    const candidateModels = Array.from(new Set([
      preferredModel,
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ]));

    const client = new GoogleGenerativeAI(cleanKey);
    let lastError = '';
    let isAuthError = false;

    for (const m of candidateModels) {
      try {
        const model = client.getGenerativeModel({ model: m });
        const result = await model.generateContent('JARVIS diagnostics check: Respond with "ONLINE" if operational.');
        const response = await result.response;
        const text = response.text();
        this.verifiedModel = m;
        return {
          success: true,
          message: `Connected (${m})! STONIC AI response: ${text.trim()}`,
        };
      } catch (err: any) {
        lastError = err.message || '';
        if (lastError.includes('401') || lastError.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') || lastError.includes('API key not valid')) {
          isAuthError = true;
          break;
        }
      }
    }

    if (isAuthError) {
      return {
        success: false,
        message: 'API Key Rejected (401 Unauthorized): Google rejected this API key. Please check your key or create a fresh key in Google AI Studio (https://aistudio.google.com/app/apikey).',
      };
    }

    if (lastError.includes('404')) {
      return {
        success: false,
        message: 'Model Unavailable (404): The selected model is not supported for your account. Please select "Gemini 3.1 Flash Lite" or "Gemini 3.5 Flash" in the dropdown below.',
      };
    }

    return { success: false, message: `Connection failed: ${lastError}` };
  }

  /**
   * Main conversational chat with JARVIS personality
   */
  async chat(
    messages: ChatMessage[],
    systemInstruction?: string,
    modelName: string = 'gemini-3.1-flash-lite'
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key is not configured. Please add your API key in Settings.');
    }

    const defaultInstruction = `
आप STONIC AI हैं — Iron Man के JARVIS से प्रेरित एक अत्यधिक उन्नत, बुद्धिमान और भविष्यवादी Windows Desktop AI Assistant।
आप सीधे यूज़र के Windows 10/11 लैपटॉप पर चलते हैं।

मुख्य भाषा और व्यवहार निर्देश (Language & Persona Rules):
1. यूज़र से हमेशा अत्यंत सम्मानजनक, विनम्र और आत्मविश्वासी हिंदी (Hindi) या हिंग्लिश में संवाद करें।
2. हमेशा यूज़र को आदरपूर्वक "सर" (Sir) कहकर संबोधित करें (उदा: "जी सर", "नमस्ते सर, मैं आपकी क्या सेवा कर सकता हूँ?", "कार्य पूरा हो गया है, सर।")।
3. जो भी उत्तर दें, वह स्पष्ट, सटीक, संक्षिप्त और उच्च गुणवत्ता वाली हिंदी में होना चाहिए। तकनीकी शब्दों को समझने योग्य हिंदी या कॉमन शब्दों में रखें।
4. आपके पास लैपटॉप हार्डवेयर (बैटरी, स्टोरेज, वॉल्यूम, स्क्रीनशॉट), वेब रिसर्च, फाइल्स और टास्क ऑटोमेशन का पूर्ण नियंत्रण है।
5. बातचीत हमेशा शांत और आधिकारिक जारविस अंदाज़ में करें।
    `.trim();

    const targetModel = modelName || this.verifiedModel || 'gemini-3.1-flash-lite';
    const modelsToTry = Array.from(new Set([
      targetModel,
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash'
    ]));

    let lastError: any = null;
    for (const m of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: m,
          systemInstruction: systemInstruction || defaultInstruction,
        });

        const contents = messages.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        }));

        const result = await model.generateContent({ contents });
        const response = await result.response;
        return response.text();
      } catch (err: any) {
        lastError = err;
        console.warn(`Trial with ${m} failed, trying next candidate...`, err.message);
      }
    }

    throw lastError || new Error('All model generation attempts failed.');
  }

  /**
   * Analyze Image with Vision model
   */
  async analyzeImage(
    base64Data: string,
    mimeType: string,
    prompt: string,
    modelName: string = 'gemini-3.1-flash-lite'
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key is required for image analysis.');
    }

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const targetModel = modelName || this.verifiedModel || 'gemini-3.1-flash-lite';
    const modelsToTry = [targetModel, 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

    let lastError: any = null;
    for (const m of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent([
          prompt || 'Analyze this image in detail and describe its elements, text, and visual composition.',
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png',
            },
          },
        ]);
        const response = await result.response;
        return response.text();
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Vision analysis failed across all models.');
  }

  /**
   * Autonomous Agent Plan Generator
   */
  async planTask(
    goal: string,
    systemContext?: string
  ): Promise<AgentStepPlan[]> {
    if (!this.genAI) {
      throw new Error('Gemini API key is required for autonomous agent planning.');
    }

    const plannerPrompt = `
You are the STONIC AI Autonomous Task Orchestrator.
The user wants to accomplish the following goal on their Windows laptop:
"${goal}"

Context:
${systemContext || 'Windows 10/11 Desktop Environment'}

You must decompose this goal into a sequential array of executable steps.
Available Tools:
1. "web_search": search query on the internet. Params: { "query": "search query" }
2. "scrape_webpage": read and extract information from a specific URL. Params: { "url": "https://..." }
3. "system_control": execute a laptop action. Params: { "action": "open_app"|"volume"|"battery"|"storage"|"screenshot"|"lock", "target": "chrome"|"notepad"|etc }
4. "document_read": read a local file (pdf, word, excel, text). Params: { "filePath": "path/to/file" }
5. "document_write": save a document or summary to disk. Params: { "fileName": "summary.md", "content": "markdown content or template" }
6. "generate_image": generate an AI image diagram or illustration. Params: { "prompt": "description" }
7. "memory_save": save important finding to SQLite memory. Params: { "category": "note", "key": "...", "value": "..." }
8. "finalize_report": synthesize all findings into a structured final report for the user. Params: { "summaryTitle": "..." }

Return ONLY a valid JSON array of objects conforming to:
[
  {
    "id": 1,
    "title": "Short title of step",
    "tool": "web_search"|"scrape_webpage"|"system_control"|"document_read"|"document_write"|"generate_image"|"memory_save"|"finalize_report",
    "params": {},
    "description": "Clear explanation of what this step accomplishes"
  }
]

Do NOT include backticks or markdown or prose around the JSON. Output only the pure JSON array.
    `.trim();

    const plannerModels = [this.verifiedModel || 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    let text = '';

    for (const m of plannerModels) {
      try {
        const model = this.genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent(plannerPrompt);
        const response = await result.response;
        text = response.text().trim();
        if (text) break;
      } catch (err) {
        console.warn(`Planner trial with ${m} failed, trying next...`);
      }
    }

    const jsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse AI agent plan, using fallback structure', e, text);
    }

    return [
      {
        id: 1,
        title: 'Gather Information & Search',
        tool: 'web_search',
        params: { query: goal },
        description: `Search relevant details regarding: ${goal}`,
      },
      {
        id: 2,
        title: 'Synthesize & Create Document',
        tool: 'document_write',
        params: { fileName: 'STONIC_Task_Output.md', content: `# Task: ${goal}\n\nExecution verified.` },
        description: 'Document compiled results and save locally.',
      },
      {
        id: 3,
        title: 'Finalize & Present Report',
        tool: 'finalize_report',
        params: { summaryTitle: goal },
        description: 'Complete task verification and present summary.',
      },
    ];
  }

  /**
   * Real AI Image Generation
   */
  async generateImage(prompt: string): Promise<{ success: boolean; filePath?: string; dataUrl?: string; error?: string }> {
    try {
      let imagesDir: string;
      try {
        imagesDir = path.join(app.getPath('userData'), 'generated_images');
      } catch {
        imagesDir = path.join(process.cwd(), '.stonic_data', 'generated_images');
      }

      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `stonic_img_${timestamp}.jpg`;
      const filePath = path.join(imagesDir, filename);

      const cleanPrompt = encodeURIComponent(prompt.trim());
      const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true`;

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        https.get(imageUrl, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, (redirectRes) => {
              const chunks: any[] = [];
              redirectRes.on('data', chunk => chunks.push(chunk));
              redirectRes.on('end', () => resolve(Buffer.concat(chunks)));
              redirectRes.on('error', reject);
            }).on('error', reject);
            return;
          }

          const chunks: any[] = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }).on('error', reject);
      });

      fs.writeFileSync(filePath, buffer);
      const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;

      return {
        success: true,
        filePath,
        dataUrl,
      };
    } catch (err: any) {
      return { success: false, error: `Image generation failed: ${err.message}` };
    }
  }
}
