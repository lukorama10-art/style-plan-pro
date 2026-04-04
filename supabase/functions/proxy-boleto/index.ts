import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { asaas_payment_id } = body;

    if (!asaas_payment_id) {
      return new Response(
        JSON.stringify({ error: "asaas_payment_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the payment details from Asaas to get bankSlipUrl
    const paymentRes = await fetch(
      `${ASAAS_SANDBOX_URL}/payments/${asaas_payment_id}`,
      { headers: { access_token: ASAAS_API_KEY } }
    );

    if (!paymentRes.ok) {
      throw new Error("Erro ao buscar dados da cobrança no Asaas");
    }

    const paymentData = await paymentRes.json();
    const bankSlipUrl = paymentData.bankSlipUrl;
    const invoiceUrl = paymentData.invoiceUrl;

    if (!bankSlipUrl && !invoiceUrl) {
      return new Response(
        JSON.stringify({ error: "Nenhum link de boleto/cobrança disponível para este pagamento." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the PDF from Asaas
    const pdfUrl = bankSlipUrl || invoiceUrl;
    const pdfRes = await fetch(pdfUrl);

    if (!pdfRes.ok) {
      throw new Error("Erro ao baixar PDF do boleto");
    }

    const pdfBuffer = await pdfRes.arrayBuffer();
    const contentType = pdfRes.headers.get("content-type") || "application/pdf";

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="boleto-${asaas_payment_id}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("Proxy boleto error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
