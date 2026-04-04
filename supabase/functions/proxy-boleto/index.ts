import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("proxy-boleto request received");

    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { asaas_payment_id } = body;

    if (!asaas_payment_id) {
      return new Response(JSON.stringify({ error: "asaas_payment_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Loading payment ${asaas_payment_id}`);

    const paymentRes = await fetch(`${ASAAS_SANDBOX_URL}/payments/${asaas_payment_id}`, {
      headers: { access_token: ASAAS_API_KEY },
    });

    if (!paymentRes.ok) {
      const paymentText = await paymentRes.text();
      console.error("Asaas payment lookup failed:", paymentText);
      throw new Error("Erro ao buscar dados da cobrança no gateway");
    }

    const paymentData = await paymentRes.json();
    const fileUrl = paymentData.bankSlipUrl || paymentData.invoiceUrl;

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "Nenhum arquivo de boleto/cobrança disponível para este pagamento." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Downloading boleto asset for payment ${asaas_payment_id}`);

    const fileRes = await fetch(fileUrl, { redirect: "follow" });

    if (!fileRes.ok) {
      const fileText = await fileRes.text();
      console.error("Asaas boleto download failed:", fileText);
      throw new Error("Erro ao baixar arquivo do boleto");
    }

    const fileBuffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get("content-type") || "application/pdf";
    const extension = contentType.includes("pdf") ? "pdf" : "bin";

    return new Response(
      JSON.stringify({
        success: true,
        base64: arrayBufferToBase64(fileBuffer),
        contentType,
        fileName: `boleto-${asaas_payment_id}.${extension}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Proxy boleto error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";

    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
