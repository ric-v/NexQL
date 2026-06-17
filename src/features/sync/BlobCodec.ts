/**
 * Pluggable item-blob codec. The sync engine and providers only ever talk to a
 * BlobCodec, never to crypto directly — so opt-in end-to-end encryption can be
 * added in a later pass by swapping the codec, with no change to the engine.
 *
 * Pass 1 ships {@link PlaintextCodec}: blobs are stored as-is (TLS in transit).
 */
export interface BlobCodec {
  readonly id: string;
  /** Local plaintext → blob for upload. */
  encode(plaintext: Buffer): Buffer;
  /** Downloaded blob → local plaintext. */
  decode(blob: Buffer): Buffer;
}

/** Identity codec — no encryption. */
export class PlaintextCodec implements BlobCodec {
  readonly id = 'plaintext';
  encode(plaintext: Buffer): Buffer {
    return plaintext;
  }
  decode(blob: Buffer): Buffer {
    return blob;
  }
}
