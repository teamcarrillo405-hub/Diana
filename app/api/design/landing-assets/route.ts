import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireLandingPageEditorUser } from "@/lib/landing-page/require-editor";
import { ownerStorageKey, validateFileUpload } from "@/lib/security/upload-validation";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const user = await requireLandingPageEditorUser();
    const formData = await request.formData();
    const asset = formData.get("asset");
    if (!(asset instanceof File)) {
      return NextResponse.json(
        { error: "Choose an image to upload." },
        { status: 400 },
      );
    }
    const validation = await validateFileUpload("landingAsset", asset);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.code === "size" ? 413 : validation.code === "empty" ? 400 : 415 },
      );
    }

    const service = createServiceClient();
    if (!service) {
      return NextResponse.json(
        { error: "Image storage is not configured." },
        { status: 503 },
      );
    }

    const path = ownerStorageKey(
      user.id,
      `${randomUUID()}.${validation.value.extension}`,
    );
    const { error } = await service.storage
      .from("landing-page-assets")
      .upload(path, Buffer.from(await asset.arrayBuffer()), {
        contentType: validation.value.mimeType,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = service.storage
      .from("landing-page-assets")
      .getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json(
      { error: "Landing page editor access is not available." },
      { status: 403 },
    );
  }
}
