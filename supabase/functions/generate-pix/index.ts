import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  merchantName: string,
  merchantCity: string,
  amount: number,
  txId: string,
  description?: string,
): string => {
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", pixKey);
  const desc = description ? tlv("02", description.slice(0, 40)) : "";
  const mai = tlv("26", `${gui}${key}${desc}`);

  const additionalData = tlv("62", tlv("05", txId.slice(0, 25)));

  let payload = "";
  payload += tlv("00", "01"); // Payload Format Indicator
  payload += mai;
  payload += tlv("52", "0000"); // MCC
  payload += tlv("53", "986"); // BRL
  payload += tlv("54", amount.toFixed(2));
  payload += tlv("58", "BR");
  payload += tlv("59", merchantName.slice(0, 25));
  payload += tlv("60", merchantCity.slice(0, 15));
  payload += additionalData;

  // CRC placeholder then calculate
  payload += "6304";
  payload += crc16(payload);

  return payload;
};

/* ── Handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PIX_KEY = Deno.env.get("PIX_KEY");
    if (!PIX_KEY) {
      throw new Error("PIX_KEY não configurada");
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
    const { amount, description, boleto_id } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const txId = `SLP${Date.now().toString(36).toUpperCase()}`;

    const brCode = buildBrCode(
      PIX_KEY,
      "SALAO STYLE PLAN",
      "SAO PAULO",
      amount,
      txId,
      description || "Servico de salao",
    );

    // Generate QR Code as base64 PNG data URI
    const qrDataUrl = await qrcode(brCode, { size: 400 }) as string;

    // If boleto_id provided, update the record
    if (boleto_id) {
      const { error: updateError } = await supabase
        .from("boletos")
        .update({
          pix_qr_code_url: qrDataUrl,
          pix_copia_e_cola: brCode,
        })
        .eq("id", boleto_id);

      if (updateError) {
        console.error("Update error:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pix_qr_code_url: qrDataUrl,
        pix_copia_e_cola: brCode,
        tx_id: txId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("generate-pix error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
