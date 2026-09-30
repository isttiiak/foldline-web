import { isbnParamSchema } from "@/features/metadata/schemas";
import { lookupIsbn } from "@/features/metadata/server/lookup";
import {
  guardMetadataRequest,
  lookupResponse,
  metadataError,
} from "@/features/metadata/server/respond";

/** One book by ISBN-10 or ISBN-13: `GET /api/metadata/isbn/<isbn>`. Signed-in only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ isbn: string }> },
) {
  const denied = await guardMetadataRequest();
  if (denied) return denied;

  const parsed = isbnParamSchema.safeParse(
    decodeURIComponent((await params).isbn),
  );
  if (!parsed.success) return metadataError("invalid_input", 400);

  return lookupResponse(await lookupIsbn(parsed.data));
}
