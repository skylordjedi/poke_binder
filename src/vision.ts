export async function getEmbedding(buffer: Buffer, filename: string): Promise<number[]> {
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), filename);
  
    const res = await fetch("http://localhost:8000/embed", { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Vision service request failed: ${res.status}`);
    const body = await res.json();
    return body.embedding;
  }
  
  export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }