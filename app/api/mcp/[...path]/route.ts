import { NextRequest } from "next/server";

const MCP_BASE = "http://localhost:8081";

export async function GET(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = params.path.join("/");
    const url = `${MCP_BASE}/${path}${req.nextUrl.search}`;

    const response = await fetch(url, {
        headers: req.headers,
    });

    return new Response(response.body, {
        status: response.status,
        headers: response.headers,
    });
}

export async function POST(
    req: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const path = params.path.join("/");
    const url = `${MCP_BASE}/${path}${req.nextUrl.search}`;

    const body = await req.text();

    const response = await fetch(url, {
        method: "POST",
        headers: req.headers,
        body,
    });

    return new Response(response.body, {
        status: response.status,
        headers: response.headers,
    });
}