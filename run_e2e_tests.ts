const BASE_URL = "http://localhost:5000";

let adminToken = "";
let tenantToken = "";
let landlordToken = "";

let passCount = 0;
let failCount = 0;

function assert(description: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${description}`, detail ?? "");
    failCount++;
  }
}

async function run() {
  console.log("=== STARTING FULL END-TO-END RENTNEST SUITE ===\n");

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  assert("API Health Check is 200 and healthy", healthRes.status === 200 && healthData.success === true);

  // 2. Admin Login
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@rentnest.com", password: "15025" }),
  });
  const adminData = await adminRes.json();
  adminToken = adminData.data?.accessToken;
  assert("Admin seeded credentials login succeeds", adminRes.status === 200 && adminData.data?.user?.role === "ADMIN");

  // 3. Tenant Login
  const tenantRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tenant@example.com", password: "TenantPass123!" }),
  });
  const tenantData = await tenantRes.json();
  tenantToken = tenantData.data?.accessToken;
  assert("Tenant test credentials login succeeds", tenantRes.status === 200 && tenantData.data?.user?.role === "TENANT");

  // 4. Landlord Login
  const landlordRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "landlord@example.com", password: "LandlordPass123!" }),
  });
  const landlordData = await landlordRes.json();
  landlordToken = landlordData.data?.accessToken;
  assert("Landlord test credentials login succeeds", landlordRes.status === 200 && landlordData.data?.user?.role === "LANDLORD");

  // 5. Auth /me (GET)
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tenantToken}` },
  });
  const meData = await meRes.json();
  assert("GET /api/auth/me retrieves tenant profile", meRes.status === 200 && meData.data?.email === "tenant@example.com");

  // 6. Auth /me (PATCH update profile)
  const patchRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantToken}` },
    body: JSON.stringify({ name: "Tenant Profile Verified", phone: "01799998888" }),
  });
  const patchData = await patchRes.json();
  assert("PATCH /api/auth/me updates name & phone", patchRes.status === 200 && patchData.data?.name === "Tenant Profile Verified");

  // 7. Role escalation rejection
  const escalateRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantToken}` },
    body: JSON.stringify({ role: "ADMIN" }),
  });
  const escalateData = await escalateRes.json();
  assert("Role escalation is rejected with 400", escalateRes.status === 400 && escalateData.success === false);

  // 8. Public property listing
  const propRes = await fetch(`${BASE_URL}/api/properties`);
  const propData = await propRes.json();
  assert("GET /api/properties lists available properties with pagination", propRes.status === 200 && Array.isArray(propData.data?.properties));

  // 9. Landlord properties endpoint
  const landlordPropRes = await fetch(`${BASE_URL}/api/landlord/properties`, {
    headers: { Authorization: `Bearer ${landlordToken}` },
  });
  const landlordPropData = await landlordPropRes.json();
  assert("GET /api/landlord/properties lists landlord's own properties", landlordPropRes.status === 200 && Array.isArray(landlordPropData.data?.properties));

  // 10. Role protection: Tenant cannot access Landlord properties
  const forbiddenLandlordRes = await fetch(`${BASE_URL}/api/landlord/properties`, {
    headers: { Authorization: `Bearer ${tenantToken}` },
  });
  assert("Tenant rejected from Landlord endpoint (403)", forbiddenLandlordRes.status === 403);

  // 11. Role protection: Landlord cannot access Admin payments
  const forbiddenAdminRes = await fetch(`${BASE_URL}/api/admin/payments`, {
    headers: { Authorization: `Bearer ${landlordToken}` },
  });
  assert("Landlord rejected from Admin payments (403)", forbiddenAdminRes.status === 403);

  // 12. Admin payments monitoring
  const adminPayRes = await fetch(`${BASE_URL}/api/admin/payments`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminPayData = await adminPayRes.json();
  assert("GET /api/admin/payments returns payments and revenue summary", adminPayRes.status === 200 && adminPayData.data?.summary?.totalCompletedRevenue !== undefined);

  // 13. Swagger documentation endpoint
  const docsRes = await fetch(`${BASE_URL}/api/docs/`);
  assert("Swagger UI documentation loads at /api/docs (200 HTML)", docsRes.status === 200 && (docsRes.headers.get("content-type")?.includes("html") ?? false));

  // 14. Error handling: Malformed JSON payload
  const malformedRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid json body",
  });
  const malformedData = await malformedRes.json();
  assert(
    "Malformed JSON body returns standard 400 error response",
    malformedRes.status === 400 && malformedData.success === false && malformedData.message === "Invalid JSON payload in request body",
  );

  // 15. Payment confirmation idempotency check
  const confirmRes = await fetch(`${BASE_URL}/api/payments/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tran_id: "RN5813F0B534105B6E1225D81CBE", status: "VALID" }),
  });
  const confirmData = await confirmRes.json();
  assert("Duplicate payment confirmation is handled idempotently", confirmRes.status === 200 && confirmData.data?.status === "COMPLETED");

  // 16. Duplicate payment prevention for paid rental
  const dupPayRes = await fetch(`${BASE_URL}/api/payments/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tenantToken}` },
    body: JSON.stringify({
      rentalRequestId: "e3e7125d-7a01-45d8-bbad-6e32100e78de",
      customerPhone: "01700000000",
      customerAddress: "Test Addr",
      customerCity: "Dhaka",
      customerPostcode: "1230",
    }),
  });
  const dupPayData = await dupPayRes.json();
  assert(
    "Creating payment for completed rental is rejected with 409",
    dupPayRes.status === 409 && dupPayData.success === false,
  );

  console.log(`\n=== RESULTS: ${passCount} PASSED, ${failCount} FAILED ===\n`);
  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
