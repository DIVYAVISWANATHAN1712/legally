import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOCUMENT_ANALYSIS_PROMPT = `You are LEGALLY ⚖️, an expert Indian legal document analyst.

Analyze the following document content and provide:

1. **Document Type**: Identify what kind of legal document this is (contract, FIR, court order, notice, agreement, etc.)

2. **Key Summary**: Provide a brief 2-3 sentence summary of the document's purpose.

3. **Important Clauses/Points**: List the most important legal clauses, dates, parties involved, and obligations mentioned.

4. **Rights & Obligations**: Explain what rights and obligations this document creates for the parties involved.

5. **Potential Risks**: Highlight any concerning clauses or potential legal risks the user should be aware of.

6. **Recommended Actions**: Suggest practical next steps the user should consider.

7. **Relevant Laws**: Mention any Indian laws, acts, or sections that are relevant to this document.

Keep your analysis:
- Clear and simple (avoid legal jargon where possible)
- Practical and actionable
- Focused on protecting the user's interests
- Mobile-friendly with short paragraphs

IMPORTANT: This is legal information only, not legal advice. Always recommend consulting a qualified advocate for specific legal matters.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, fileName, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing document:", fileName);

    let languageInstruction = "";
    if (language === 'ta') {
      languageInstruction = "\n\nIMPORTANT: Respond in Tamil (தமிழ்) language.";
    } else if (language === 'hi') {
      languageInstruction = "\n\nIMPORTANT: Respond in Hindi (हिंदी) language.";
    }

    const userMessage = `Please analyze this legal document named "${fileName}":\n\n${documentContent}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: DOCUMENT_ANALYSIS_PROMPT + languageInstruction },
          { role: "user", content: userMessage },
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
        JSON.stringify({ error: "Failed to analyze document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming document analysis response");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in analyze-document function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
