import { NextRequest, NextResponse } from "next/server";

const UNISWAP_API_BASE = "https://trade-api.gateway.uniswap.org/v1";
const API_KEY = process.env.UNISWAP_API_KEY!;

const ALLOWED_ENDPOINTS = ["quote", "swap", "check_approval"] as const;

export async function POST(req: NextRequest) {
  const { endpoint, ...body } = await req.json();

  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const res = await fetch(`${UNISWAP_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json(data);
}
