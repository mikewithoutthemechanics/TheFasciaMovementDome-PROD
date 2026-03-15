import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// ============================================
// AI Service Types
// ============================================

export type AIProvider = 'gemini' | 'openrouter';

export interface AIGenerateRequest {
  targetAudience: string;
  focusArea: string;
  scienceFocus: string;
  tone: string;
}

export interface AIChatRequest {
  message: string;
  context?: {
    userId?: string;
    userName?: string;
    className?: string;
    recentBookings?: string[];
  };
}

export interface AIResponse {
  text: string;
  provider: AIProvider;
  model?: string;
}

// ============================================
// AI Service Class
// ============================================

/**
 * SECURITY: Sanitises user-supplied strings before they are interpolated into
 * AI prompts. Strips prompt-injection patterns (e.g. "ignore previous instructions",
 * role-switching attempts, angle-bracket injections) and enforces a max length so
 * a user cannot blow up token budgets or override system context.
 */
function sanitiseInput(value: string, maxLength = 200): string {
  if (typeof value !== 'string') return '';
  return value
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')                          // strip HTML/XML tags
    .replace(/\bignore\b.{0,40}\binstructions?\b/gi, '[removed]')
    .replace(/\bforget\b.{0,30}\babove\b/gi, '[removed]')
    .replace(/\byou are now\b/gi, '[removed]')
    .replace(/\bact as\b/gi, '[removed]')
    .replace(/\bsystem:\b/gi, '[removed]')
    .replace(/\bprompt:\b/gi, '[removed]')
    .trim();
}

class AIService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenAI | null = null;
  private primaryProvider: AIProvider = 'gemini';
  private fallbackProvider: AIProvider = 'openrouter';

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Initialize Gemini (primary)
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.primaryProvider = 'gemini';
      console.log('✅ AI service: Gemini initialized as primary');
    }

    // Initialize OpenAI with OpenRouter (fallback)
    if (process.env.OPENROUTER_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      console.log('✅ AI service: OpenRouter initialized as fallback');
    }

    // Determine which provider to use
    if (!this.gemini && !this.openai) {
      console.warn('⚠️  AI service: No providers configured - using mock mode');
    } else if (!this.gemini && this.openai) {
      this.primaryProvider = 'openrouter';
      console.log('⚠️  AI service: Gemini not configured, using OpenRouter as primary');
    }
  }

  getProvider(): AIProvider {
    return this.primaryProvider;
  }

  isConfigured(): boolean {
    return this.gemini !== null || this.openai !== null;
  }

  // ============================================
  // Template Generation (with fallback)
  // ============================================

  async generateTemplate(request: AIGenerateRequest): Promise<AIResponse> {
    // Try primary provider first (Gemini)
    if (this.primaryProvider === 'gemini' && this.gemini) {
      try {
        const result = await this.generateWithGemini(request);
        return result;
      } catch (error) {
        console.warn('⚠️  Gemini generation failed, trying OpenRouter:', error);
      }
    }

    // Try fallback provider (OpenRouter)
    if (this.openai) {
      try {
        const result = await this.generateWithOpenRouter(request);
        return result;
      } catch (error) {
        console.error('❌ OpenRouter generation also failed:', error);
      }
    }

    // If both fail, return mock response
    return this.generateMockResponse(request);
  }

  private async generateWithGemini(request: AIGenerateRequest): Promise<AIResponse> {
    if (!this.gemini) throw new Error('Gemini not configured');

    // SECURITY: Sanitise all user-controlled fields before prompt interpolation
    const targetAudience = sanitiseInput(request.targetAudience);
    const focusArea = sanitiseInput(request.focusArea);
    const scienceFocus = sanitiseInput(request.scienceFocus);
    const tone = sanitiseInput(request.tone, 50);

    const prompt = `
      You are a world-class Fascia Movement educator and copywriter for a premium studio "Pause - The Fascia Movement Dome".
      
      OBJECTIVE:
      Create a personalized, converting invite campaign that EDUCATES the user on the science of their body while inviting them to move.
      
      CONTEXT & PARAMETERS:
      - Target Audience: ${targetAudience}
      - Pain Point / Focus: ${focusArea}
      - Scientific Concept: ${scienceFocus}
      - Tone: ${tone}
      
      DELIVERABLES (JSON):
      1. **whatsappBody**: Short (max 50 words), punchy, use 2-3 emojis. Must include {{invite_link}} and {{class_date}}. Focus on the *feeling* of relief or freedom.
      2. **emailSubject**: Curious, short, personalized using {{referrer_first_name}}.
      3. **emailBody**: 
         - Opening: Warm, personal connection from the referrer.
         - **The Micro-Lesson**: A dedicated paragraph explaining the chosen Scientific Concept (${scienceFocus}) simply, using an analogy (e.g., dry sponge vs wet sponge, rubber band, etc.). Explain *why* this causes their ${focusArea} issues.
         - The Solution: How the class specifically addresses this mechanism.
         - Call to Action: Clear and inviting.
      
      OUTPUT:
      Return ONLY raw JSON (no markdown blocks) with keys: "emailSubject", "emailBody", "whatsappBody".
    `;

    const response = await this.gemini.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    let text = response.text || "{}";
    if (text.startsWith("```")) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(text);

    return {
      text: JSON.stringify(result),
      provider: 'gemini',
      model: 'gemini-3-flash-preview'
    };
  }

  private async generateWithOpenRouter(request: AIGenerateRequest): Promise<AIResponse> {
    if (!this.openai) throw new Error('OpenRouter not configured');

    // SECURITY: Sanitise all user-controlled fields before prompt interpolation
    const targetAudience = sanitiseInput(request.targetAudience);
    const focusArea = sanitiseInput(request.focusArea);
    const scienceFocus = sanitiseInput(request.scienceFocus);
    const tone = sanitiseInput(request.tone, 50);

    const prompt = `
      You are a world-class Fascia Movement educator and copywriter for a premium studio "Pause - The Fascia Movement Dome".
      
      OBJECTIVE:
      Create a personalized, converting invite campaign that EDUCATES the user on the science of their body while inviting them to move.
      
      CONTEXT & PARAMETERS:
      - Target Audience: ${targetAudience}
      - Pain Point / Focus: ${focusArea}
      - Scientific Concept: ${scienceFocus}
      - Tone: ${tone}
      
      DELIVERABLES (JSON):
      1. **whatsappBody**: Short (max 50 words), punchy, use 2-3 emojis. Must include {{invite_link}} and {{class_date}}. Focus on the *feeling* of relief or freedom.
      2. **emailSubject**: Curious, short, personalized using {{referrer_first_name}}.
      3. **emailBody**: 
         - Opening: Warm, personal connection from the referrer.
         - **The Micro-Lesson**: A dedicated paragraph explaining the chosen Scientific Concept (${scienceFocus}) simply, using an analogy (e.g., dry sponge vs wet sponge, rubber band, etc.). Explain *why* this causes their ${focusArea} issues.
         - The Solution: How the class specifically addresses this mechanism.
         - Call to Action: Clear and inviting.
      
      OUTPUT:
      Return ONLY raw JSON (no markdown blocks) with keys: "emailSubject", "emailBody", "whatsappBody".
    `;

    const completion = await this.openai.chat.completions.create({
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'You are a world-class Fascia Movement educator and copywriter for "Pause - The Fascia Movement Dome". Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const text = completion.choices[0]?.message?.content || "{}";

    return {
      text,
      provider: 'openrouter',
      model: completion.model
    };
  }

  private generateMockResponse(request: AIGenerateRequest): AIResponse {
    const mockResult = {
      emailSubject: `Unlock better movement, ${request.targetAudience}! 🧘`,
      emailBody: `Hi there!\n\nAs a ${request.targetAudience}, you know how frustrating ${request.focusArea} issues can be. The good news? It's not your fault - it's your fascia!\n\nThink of your fascia like a wet sponge that's dried out. When it's dehydrated and tight, everything feels restricted. But when you rehydrate and warm it up, everything moves freely again.\n\nOur Dome Session specifically targets ${request.scienceFocus} - the key to unlocking ${request.focusArea} relief.\n\nBook your spot today and feel the difference!\n\nWarmly,\nThe Pause Team`,
      whatsappBody: `🧘 Hey! Ready to unlock better movement? ✨ Your body will thank you. ${request.focusArea} relief is closer than you think - join us! {{class_date}} → {{invite_link}}`
    };

    return {
      text: JSON.stringify(mockResult),
      provider: 'gemini', // Report as primary for consistency
      model: 'mock'
    };
  }

  // ============================================
  // Chatbot / Customer Query Support
  // ============================================

  async chat(request: AIChatRequest): Promise<AIResponse> {
    // SECURITY: Sanitise all user-controlled context fields before prompt interpolation
    const safeMessage = sanitiseInput(request.message, 500);
    const safeUserName = sanitiseInput(request.context?.userName || 'Guest', 50);
    const safeClassName = sanitiseInput(request.context?.className || '', 100);
    const safeBookings = (request.context?.recentBookings || [])
      .slice(0, 5)
      .map(b => sanitiseInput(b, 50));

    const contextInfo = request.context ? `
      User Context:
      - Name: ${safeUserName}
      - Recent Bookings: ${safeBookings.join(', ') || 'None'}
      ${safeClassName ? `- Current Interest: ${safeClassName}` : ''}
    ` : '';

    // Try primary provider first (Gemini)
    if (this.primaryProvider === 'gemini' && this.gemini) {
      try {
        const result = await this.chatWithGemini(safeMessage, contextInfo);
        return result;
      } catch (error) {
        console.warn('⚠️  Gemini chat failed, trying OpenRouter:', error);
      }
    }

    // Try fallback provider (OpenRouter)
    if (this.openai) {
      try {
        const result = await this.chatWithOpenRouter(safeMessage, contextInfo);
        return result;
      } catch (error) {
        console.error('❌ OpenRouter chat also failed:', error);
      }
    }

    // Fallback to mock
    return this.chatMock(safeMessage);
  }

  private async chatWithGemini(message: string, contextInfo: string): Promise<AIResponse> {
    if (!this.gemini) throw new Error('Gemini not configured');

    const prompt = `
      You are a helpful assistant for "Pause - The Fascia Movement Dome", a premium fascia movement studio.
      
      ${contextInfo}
      
      Guidelines:
      - Be warm, friendly, and professional
      - Provide accurate information about fascia movement and the studio's classes
      - Keep responses concise but informative
      - If you don't know something, suggest they contact the studio directly
      - Never make medical claims
      
      Customer question: ${message}
      
      Your response:`;

    const response = await this.gemini.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.7 }
    });

    return {
      text: response.text || "I'm here to help! Please contact us directly for more information.",
      provider: 'gemini',
      model: 'gemini-3-flash-preview'
    };
  }

  private async chatWithOpenRouter(message: string, contextInfo: string): Promise<AIResponse> {
    if (!this.openai) throw new Error('OpenRouter not configured');

    const completion = await this.openai.chat.completions.create({
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant for "Pause - The Fascia Movement Dome", a premium fascia movement studio.

${contextInfo}

Guidelines:
- Be warm, friendly, and professional
- Provide accurate information about fascia movement and the studio's classes
- Keep responses concise but informative
- If you don't know something, suggest they contact the studio directly
- Never make medical claims`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7
    });

    return {
      text: completion.choices[0]?.message?.content || "I'm here to help! Please contact us directly for more information.",
      provider: 'openrouter',
      model: completion.model
    };
  }

  private chatMock(message: string): AIResponse {
    // Simple rule-based responses for mock mode
    const lowerMessage = message.toLowerCase();
    
    let response = "Thanks for reaching out! I'm here to help with any questions about our fascia movement sessions. ";
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
      response += "Our classes start at R250 for a drop-in session. We also offer class packs and packages for regulars. Check our website or WhatsApp us for current pricing!";
    } else if (lowerMessage.includes('book') || lowerMessage.includes('class') || lowerMessage.includes('schedule')) {
      response += "You can book classes directly through our app! Browse upcoming sessions, find one that fits your schedule, and reserve your spot in the Dome.";
    } else if (lowerMessage.includes('what') || lowerMessage.includes('about') || lowerMessage.includes(' fascia')) {
      response += "Fascia is the connective tissue in your body - think of it like a web that connects everything. When it's healthy and hydrated, you move freely. Our classes help release tension and improve mobility!";
    } else if (lowerMessage.includes('where') || lowerMessage.includes('location') || lowerMessage.includes('venue')) {
      response += "We're located in Cape Town. Check our website for the exact venue details and directions!";
    } else if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
      response += "We understand plans change! Please cancel at least 24 hours before class to not lose your credit. Contact us directly for special circumstances.";
    } else {
      response += "Feel free to WhatsApp us or email hello@pausefmd.co.za for more specific questions!";
    }

    return {
      text: response,
      provider: 'gemini',
      model: 'mock'
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
