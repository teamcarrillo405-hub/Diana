import "server-only";
import { createLearningClient } from "./server";
import { assertMaterialScope, parseMaterialDocument, type MaterialScope, type MaterialBinding } from "./material-activity";
type Client = Awaited<ReturnType<typeof createLearningClient>>;
/** Always reload owned, immutable source versions. Browser excerpts are never trusted. */
export async function loadMaterialDocuments(client: Client, scope: MaterialScope, passages: MaterialBinding["passages"]) {
    const ids = [...new Set(passages.map(item => item.versionId))];
    const [versions, blocks] = await Promise.all([
        client.from("learning_documents").select("id,metadata,pages").eq("owner_id", scope.ownerId).eq("assignment_id", scope.assignmentId).eq("class_id", scope.classId).in("id", ids),
        client.from("learning_blocks").select("version_id,payload").eq("owner_id", scope.ownerId).in("version_id", ids).in("id", passages.map(item => item.blockId)),
    ]);
    if (versions.error || blocks.error)
        throw new Error("store_unavailable");
    if (versions.data?.length !== ids.length)
        throw new Error("source_unavailable");
    return versions.data.map(row => {
        const document = parseMaterialDocument({ metadata: row.metadata, pages: row.pages, blocks: (blocks.data ?? []).filter(block => block.version_id === row.id).map(block => block.payload) });
        if (document.version.id !== row.id)
            throw new Error("source_conflict");
        assertMaterialScope(document, scope);
        return document;
    });
}
