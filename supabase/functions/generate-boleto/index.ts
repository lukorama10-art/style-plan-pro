import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractGatewayErrorMessage = (data: any) => {
  if (!data) return null;

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors
      .map((error: any) => error?.description || error?.code)
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  return null;
};

const fetchPixData = async (paymentId: string, apiKey: string) => {
  // Try up to 6 times with increasing delays (1s, 2s, 3s, 4s, 5s)
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) {
      await wait(1000 * attempt);
    }

    console.log(`PIX attempt ${attempt + 1}/6 for payment ${paymentId}`);

    const pixResponse = await fetch(
      `${ASAAS_SANDBOX_URL}/payments/${paymentId}/pixQrCode`,
      { headers: { access_token: apiKey } }
    );

    const pixData = await pixResponse.json().catch(() => null);
    const gatewayErrorMessage = extractGatewayErrorMessage(pixData);
    console.log(`PIX response status: ${pixResponse.status}, has data: ${!!(pixData?.encodedImage || pixData?.payload)}, error: ${gatewayErrorMessage || "none"}`);

    if (pixResponse.ok && pixData && (pixData.encodedImage || pixData.payload)) {
      return {
        pixQrCodeUrl: pixData.encodedImage
          ? `data:image/png;base64,${pixData.encodedImage}`
          : null,
        pixCopiaECola: pixData.payload || null,
        found: true,
        terminal: false,
        errorMessage: null,
      };
    }

    if (!pixResponse.ok) {
      const isTerminalError = pixResponse.status >= 400 && pixResponse.status < 500 && pixResponse.status !== 429;

      if (isTerminalError) {
        return {
          pixQrCodeUrl: null,
          pixCopiaECola: null,
          found: false,
          terminal: true,
          errorMessage:
            gatewayErrorMessage ||
            "O gateway recusou a geração do QR Code PIX. Verifique se a chave PIX está ativa na conta Sandbox.",
        };
      }
    }
  }

  return {
    pixQrCodeUrl: null,
    pixCopiaECola: null,
    found: false,
    terminal: false,
    errorMessage: "O QR Code PIX ainda não está disponível no gateway. O sandbox do Asaas pode demorar alguns minutos. Tente novamente em breve.",
  };
};

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
    const {
      action,
      appointment_id,
      client_id,
      client_name,
      client_cpf,
      client_email,
      amount,
      due_date,
      description,
      billing_type = "BOLETO",
      boleto_id,
      asaas_payment_id,
    } = body;

    // ── Refresh PIX ──
    if (action === "refresh_pix") {
      if (!boleto_id || !asaas_payment_id) {
        return new Response(
          JSON.stringify({ success: false, error: "boleto_id e asaas_payment_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pixData = await fetchPixData(asaas_payment_id, ASAAS_API_KEY);

      if (!pixData.found) {
        return new Response(
          JSON.stringify({
            success: false,
            retryable: !pixData.terminal,
            error: pixData.errorMessage || "O QR Code PIX ainda não está disponível no gateway. O sandbox do Asaas pode demorar alguns minutos. Tente novamente em breve.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("boletos")
        .update({
          billing_type: "PIX",
          pix_qr_code_url: pixData.pixQrCodeUrl,
          pix_copia_e_cola: pixData.pixCopiaECola,
        })
        .eq("id", boleto_id);

      if (updateError) {
        throw new Error(`Erro ao atualizar PIX: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, boleto: pixData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Create new charge ──
    if (!client_name || !amount || !due_date) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: client_name, amount, due_date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanCpf = client_cpf ? client_cpf.replace(/\D/g, '') : null;

    if (!cleanCpf || cleanCpf.length !== 11) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "CPF do cliente é obrigatório para geração de cobrança. Cadastre o CPF no perfil do cliente.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create or find customer in Asaas
    const customerResponse = await fetch(`${ASAAS_SANDBOX_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name: client_name,
        cpfCnpj: cleanCpf,
        email: client_email || undefined,
      }),
    });

    const customerData = await customerResponse.json();
    let customerId = customerData.id;

    if (!customerId && customerData.errors) {
      const isAlreadyRegistered = customerData.errors.some(
        (e: any) => e.description?.toLowerCase().includes("já cadastrado") ||
                     e.code === "invalid_cpfCnpj_already_in_use"
      );

      if (isAlreadyRegistered) {
        const searchResponse = await fetch(
          `${ASAAS_SANDBOX_URL}/customers?cpfCnpj=${cleanCpf}`,
          { headers: { access_token: ASAAS_API_KEY } }
        );
        const searchData = await searchResponse.json();
        customerId = searchData.data?.[0]?.id;
      }

      if (!customerId) {
        console.error("Asaas customer error:", customerData);
        throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(customerData)}`);
      }
    }

    // Step 2: Create payment
    const validBillingType = billing_type === "PIX" ? "PIX" : "BOLETO";

    const paymentResponse = await fetch(`${ASAAS_SANDBOX_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: validBillingType,
        value: amount,
        dueDate: due_date,
        description: description || "Serviço de salão",
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("Asaas payment error:", paymentData);
      throw new Error(`Erro ao gerar cobrança: ${JSON.stringify(paymentData)}`);
    }

    // Step 2.5: If PIX, fetch the QR Code
    const pixData = validBillingType === "PIX" && paymentData.id
      ? await fetchPixData(paymentData.id, ASAAS_API_KEY)
      : { pixQrCodeUrl: null, pixCopiaECola: null, found: false };

    // Step 3: Save payment info in database
    const { data: boleto, error: insertError } = await supabase
      .from("boletos")
      .insert({
        appointment_id: appointment_id || null,
        client_id: client_id || null,
        asaas_payment_id: paymentData.id,
        asaas_customer_id: customerId,
        amount: paymentData.value,
        due_date: paymentData.dueDate,
        status: paymentData.status,
        boleto_url: paymentData.bankSlipUrl || null,
        invoice_url: paymentData.invoiceUrl || null,
        description: paymentData.description,
        billing_type: validBillingType,
        pix_qr_code_url: pixData.pixQrCodeUrl,
        pix_copia_e_cola: pixData.pixCopiaECola,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Erro ao salvar cobrança: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pix_pending: validBillingType === "PIX" && !pixData.found && !pixData.terminal,
        pix_error: validBillingType === "PIX" && !pixData.found ? pixData.errorMessage : null,
        pix_retryable: validBillingType === "PIX" && !pixData.found ? !pixData.terminal : false,
        boleto: {
          id: boleto.id,
          asaas_payment_id: paymentData.id,
          boleto_url: paymentData.bankSlipUrl,
          invoice_url: paymentData.invoiceUrl,
          invoice_number: paymentData.invoiceNumber,
          amount: paymentData.value,
          due_date: paymentData.dueDate,
          status: paymentData.status,
          billing_type: validBillingType,
          pix_qr_code_url: pixData.pixQrCodeUrl,
          pix_copia_e_cola: pixData.pixCopiaECola,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating boleto:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
