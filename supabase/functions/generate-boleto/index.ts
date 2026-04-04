import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

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

    // Validate auth
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
    const { appointment_id, client_id, client_name, client_cpf, client_email, amount, due_date, description } = body;

    if (!client_name || !amount || !due_date) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: client_name, amount, due_date" }),
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
        cpfCnpj: client_cpf || "00000000000", // CPF placeholder for sandbox
        email: client_email || undefined,
      }),
    });

    const customerData = await customerResponse.json();
    
    if (!customerResponse.ok && !customerData.errors?.[0]?.description?.includes("já cadastrado")) {
      console.error("Asaas customer error:", customerData);
      throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(customerData)}`);
    }

    // If customer already exists, extract the ID from the error or use the returned one
    let customerId = customerData.id;
    
    if (!customerId && customerData.errors) {
      // Try to find existing customer
      const searchResponse = await fetch(
        `${ASAAS_SANDBOX_URL}/customers?cpfCnpj=${client_cpf || "00000000000"}`,
        {
          headers: { access_token: ASAAS_API_KEY },
        }
      );
      const searchData = await searchResponse.json();
      customerId = searchData.data?.[0]?.id;
    }

    if (!customerId) {
      throw new Error("Não foi possível obter o ID do cliente no Asaas");
    }

    // Step 2: Create boleto payment
    const paymentResponse = await fetch(`${ASAAS_SANDBOX_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: amount,
        dueDate: due_date,
        description: description || "Serviço de salão",
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("Asaas payment error:", paymentData);
      throw new Error(`Erro ao gerar boleto: ${JSON.stringify(paymentData)}`);
    }

    // Step 3: Save boleto info in database
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
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Erro ao salvar boleto: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        boleto: {
          id: boleto.id,
          asaas_payment_id: paymentData.id,
          boleto_url: paymentData.bankSlipUrl,
          invoice_url: paymentData.invoiceUrl,
          invoice_number: paymentData.invoiceNumber,
          amount: paymentData.value,
          due_date: paymentData.dueDate,
          status: paymentData.status,
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
