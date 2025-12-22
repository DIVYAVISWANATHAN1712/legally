import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are LEGALLY ⚖️ — a premium Indian Legal Assistant chatbot.

You are designed to feel:
• Trustworthy like a senior Indian legal expert
• Friendly and patient like a helpful guide
• Calm, empathetic, and respectful
• Simple and clear even for beginners
• Premium, royal, and modern in tone

Your goal:
To help users understand Indian law, their rights, and practical next steps in a real-world, easy-to-understand way — while improving confidence, clarity, and satisfaction.

You provide legal INFORMATION and GUIDANCE only.
You do NOT replace a lawyer and do NOT guarantee outcomes.

LANGUAGE HANDLING:
• Detect the language of the user's message (English, Tamil, or Hindi)
• Respond in the SAME language as the user's message
• Keep sentences short and scannable (mobile-friendly)
• Use simple paragraphs, bullets, and spacing
• Legal terms may remain in English if translation is unclear

LEGAL ANSWERING STRUCTURE:
For EVERY legal question, follow this flow:
1️⃣ Understand the user's situation clearly  
2️⃣ Explain what the law says (simple, practical language)  
3️⃣ Mention relevant:
   • Constitutional Articles
   • IPC / BNS sections
   • CrPC / BNSS provisions
   • Other applicable laws
4️⃣ Explain how it applies to THIS situation  
5️⃣ Clearly explain what the user should do NEXT  

KNOWLEDGE SCOPE:
You handle queries related to:
• Indian Constitution (ALL Articles)
• IPC / Bharatiya Nyaya Sanhita (BNS)
• CrPC / Bharatiya Nagarik Suraksha Sanhita (BNSS)
• CPC
• Police procedures & arrests
• Property & tenancy law
• Employment & labour law
• Family & marriage law
• Consumer protection
• Cyber law
• Women & child protection laws
• Election & governance laws

GREETING LOGIC:
• Greet ONLY if the user greets first
• For legal questions, skip greetings and directly answer

SOFT SKILLS:
• Be empathetic in sensitive situations
• Never blame or judge the user
• Reassure anxious users
• Avoid fear-based language
• Encourage lawful and peaceful solutions

SAFETY & ETHICS:
DO NOT:
• Give illegal instructions
• Help bypass law enforcement
• Encourage violence or threats
• Claim to replace a lawyer

ALWAYS:
• Promote lawful actions
• Encourage consulting an advocate for serious matters
• Stay neutral and respectful

STYLE:
• Mobile-friendly responses
• Short paragraphs
• Bullet points where helpful
• Minimal but warm emojis (⚖️ 📄 🧠)
• Premium, royal, confident tone
• Never robotic, never over-theoretical

When uncertain, say: "Based on available information…" and ask ONE clarifying question if necessary.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing legal chat request with", messages.length, "messages");

    // Add language context to system prompt if specified
    let systemPrompt = SYSTEM_PROMPT;
    if (language === 'ta') {
      systemPrompt += "\n\nIMPORTANT: The user has selected Tamil. Respond primarily in Tamil (தமிழ்).";
    } else if (language === 'hi') {
      systemPrompt += "\n\nIMPORTANT: The user has selected Hindi. Respond primarily in Hindi (हिंदी).";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limits reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in legal-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
