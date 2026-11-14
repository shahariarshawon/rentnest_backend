import { AppError } from "../utils/appError.js";

// ===========================
// TYPES
// ===========================

export interface SSLCommerzInitResponse {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
}

export interface SSLCommerzValidationResponse {
  status?: string;
  APIConnect?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  currency_type?: string;
  risk_level?: string;
  bank_tran_id?: string;
  card_type?: string;
  tran_date?: string;
}

interface SSLCommerzTransaction {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  risk_level?: string;
  bank_tran_id?: string;
  card_type?: string;
  tran_date?: string;
}

interface SSLCommerzQueryResponse {
  APIConnect?: string;
  element?: SSLCommerzTransaction[];
}

// ===========================
// CONFIGURATION
// ===========================

const getConfig = () => {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;

  const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";

  if (!storeId || !storePassword) {
    throw new AppError("SSLCommerz credentials are not configured", 500);
  }

  const baseUrl = isLive
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";

  return {
    storeId,
    storePassword,
    baseUrl,
  };
};

// ===========================
// INITIATE PAYMENT SESSION
// ===========================

export const initiateSSLPayment = async (
  payload: Record<string, string>,
): Promise<SSLCommerzInitResponse> => {
  const config = getConfig();

  const formData = new URLSearchParams({
    store_id: config.storeId,
    store_passwd: config.storePassword,
    ...payload,
  });

  const response = await fetch(`${config.baseUrl}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new AppError("SSLCommerz session creation failed", 502);
  }

  const result = (await response.json()) as SSLCommerzInitResponse;

  if (
    result.status !== "SUCCESS" ||
    !result.sessionkey ||
    !result.GatewayPageURL
  ) {
    throw new AppError(
      result.failedreason || "Unable to create payment session",
      502,
    );
  }

  return result;
};

// ===========================
// VALIDATE PAYMENT
// ===========================


export const validateSSLPayment = async (
  valId: string,
): Promise<SSLCommerzValidationResponse> => {
  const config = getConfig();

  const params = new URLSearchParams({
    val_id: valId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    v: "1",
    format: "json",
  });

  const url =
    `${config.baseUrl}/validator/api/validationserverAPI.php?${params}`;

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    console.error("SSLCommerz Validation HTTP Error:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
    });

    throw new AppError(
      `SSLCommerz validation API returned HTTP ${response.status}`,
      502
    );
  }

  const responseText = await response.text();

  let result: SSLCommerzValidationResponse;

  try {
    result = JSON.parse(responseText) as
      SSLCommerzValidationResponse;
  } catch {
    console.error(
      "SSLCommerz returned an invalid JSON response"
    );

    throw new AppError(
      "Invalid response received from SSLCommerz",
      502
    );
  }

  console.log("SSLCommerz Validation Result:", {
    status: result.status,
    tran_id: result.tran_id,
    amount: result.amount,
    currency: result.currency,
    currency_type: result.currency_type,
  });

  return result;
};


// ===========================
// QUERY TRANSACTION BY ID
// ===========================

export const querySSLTransaction = async (
  tranId: string,
): Promise<SSLCommerzQueryResponse> => {
  const config = getConfig();

  const params = new URLSearchParams({
    tran_id: tranId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    v: "1",
    format: "json",
  });

  const response = await fetch(
    `${config.baseUrl}/validator/api/merchantTransIDvalidationAPI.php?${params}`,
    {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    throw new AppError("Unable to query SSLCommerz transaction", 502);
  }

  return (await response.json()) as SSLCommerzQueryResponse;
};
