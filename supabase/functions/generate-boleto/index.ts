import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_SANDBOX_URL = "https://sandbox.asaas.com/api/v3";

/* ── BR Code (EMV) helpers ── */

const tlv = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`;

const crc16 = (payload: string): string => {
  const poly = 0x1021;
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ poly : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

const buildBrCode = (
  pixKey: string,
  amount: number,
  description?: string,
): string => {
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", pixKey);
  const desc = description ? tlv("02", description.slice(0, 40)) : "";
  const mai = tlv("26", `${gui}${key}${desc}`);
  const txId = `SLP${Date.now().toString(36).toUpperCase()}`;
  const additionalData = tlv("62", tlv("05", txId.slice(0, 25)));

  let payload = "";
  payload += tlv("00", "01");
  payload += mai;
  payload += tlv("52", "0000");
  payload += tlv("53", "986");
  payload += tlv("54", amount.toFixed(2));
  payload += tlv("58", "BR");
  payload += tlv("59", "SALAO STYLE PLAN");
  payload += tlv("60", "SAO PAULO");
  payload += additionalData;
  payload += "6304";
  payload += crc16(payload);
  return payload;
};

const generatePixQrCode = async (pixKey: string, amount: number, description?: string) => {
  try {
    const { qrcode } = await import("https://deno.land/x/qrcode@v2.0.0/mod.ts");
    const brCode = buildBrCode(pixKey, amount, description);
    const qrDataUrl = await qrcode(brCode, { size: 400 }) as string;
    return { pixQrCodeUrl: qrDataUrl, pixCopiaECola: brCode, found: true };
  } catch (err) {
    console.error("Erro ao gerar QR Code PIX:", err);
    return { pixQrCodeUrl: null, pixCopiaECola: null, found: false };
  }
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

    const PIX_KEY = Deno.env.get("PIX_KEY");

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
      if (!boleto_id) {
        return new Response(
          JSON.stringify({ success: false, error: "boleto_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!PIX_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: "Chave PIX não configurada no sistema." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the boleto to know the amount
      const { data: existingBoleto } = await supabase
        .from("boletos")
        .select("amount, description")
        .eq("id", boleto_id)
        .single();

      if (!existingBoleto) {
        return new Response(
          JSON.stringify({ success: false, error: "Cobrança não encontrada." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pixData = await generatePixQrCode(PIX_KEY, existingBoleto.amount, existingBoleto.description || undefined);

      if (!pixData.found) {
        return new Response(
          JSON.stringify({ success: false, error: "Erro ao gerar QR Code PIX." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("boletos")
        .update({
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
    const validBillingType = ["PIX", "BOLETO", "UNDEFINED"].includes(billing_type) ? billing_type : "UNDEFINED";

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

    // Generate PIX QR Code using our own key (independent of Asaas)
    const pixData = PIX_KEY
      ? await generatePixQrCode(PIX_KEY, amount, description)
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
        pix_pending: !pixData.found,
        pix_error: !pixData.found ? "Não foi possível gerar o QR Code PIX." : null,
        pix_retryable: !pixData.found,
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
