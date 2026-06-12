import { NextResponse } from "next/server";
import { list, put, del, get } from "@vercel/blob";

export const runtime = "nodejs";

// Prefix all exam blobs with this path
const BLOB_PREFIX = "exams/";

/**
 * GET /api/exams
 * List all uploaded exams (metadata only — not the full questions)
 * OR if a 'url' query parameter is provided, fetch and return the exam's questions.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blobUrl = searchParams.get("url");

    if (blobUrl) {
      const blob = await get(blobUrl, { access: "private" });
      if (!blob || blob.statusCode !== 200 || !blob.stream) {
        return NextResponse.json(
          { error: "Blob not found or not modified" },
          { status: 404 }
        );
      }
      const response = new Response(blob.stream);
      const data = await response.json();
      return NextResponse.json(data);
    }

    const { blobs } = await list({ prefix: BLOB_PREFIX });

    const exams = blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map((b) => {
        // pathname format: "exams/{timestamp}_{slugName}.json"
        const filename = b.pathname.replace(BLOB_PREFIX, "").replace(".json", "");
        const parts = filename.split("_");
        const timestamp = parts[0];
        const name = parts.slice(1).join(" ");

        return {
          id: filename,
          name: decodeURIComponent(name),
          url: b.url,
          uploadedAt: timestamp,
          size: b.size,
        };
      });

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("Failed to list/get exams:", error);
    return NextResponse.json(
      { error: "Failed to load/list exams" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exams
 * Save a new exam. Body: { name: string, questions: Question[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, questions } = body;

    if (!name || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Name and a non-empty questions array are required." },
        { status: 400 }
      );
    }

    // Create a URL-safe slug for the filename
    const slug = encodeURIComponent(
      name.trim().replace(/\s+/g, "_").toLowerCase()
    );
    const timestamp = Date.now();
    const pathname = `${BLOB_PREFIX}${timestamp}_${slug}.json`;

    // Use private access for private store compatibility
    const blob = await put(pathname, JSON.stringify(questions), {
      access: "private",
      contentType: "application/json",
    });

    return NextResponse.json({
      id: `${timestamp}_${slug}`,
      name,
      url: blob.url,
      questionCount: questions.length,
    });
  } catch (error) {
    console.error("Failed to save exam:", error);
    return NextResponse.json(
      { error: "Failed to save exam" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exams
 * Delete an exam by url. Body: { url: string }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Blob URL is required." },
        { status: 400 }
      );
    }

    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete exam:", error);
    return NextResponse.json(
      { error: "Failed to delete exam" },
      { status: 500 }
    );
  }
}
