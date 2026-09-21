import json
import struct
import sys

import numpy as np


def main():
    model_path, metadata_path, output_path = sys.argv[1:4]
    with open(metadata_path, "r", encoding="utf-8") as source:
        metadata = json.load(source)

    with open(model_path, "rb") as source:
        header_size = struct.unpack("<Q", source.read(8))[0]
        header = json.loads(source.read(header_size))

    tensor = header["embeddings"]
    rows, dimensions = tensor["shape"]
    data_offset = 8 + header_size + tensor["data_offsets"][0]
    embeddings = np.memmap(
        model_path,
        dtype="<f4",
        mode="r",
        offset=data_offset,
        shape=(rows, dimensions),
    )

    vocabulary_indices = np.asarray(metadata["vocabulary_indices"], dtype=np.int64)
    target_indices = np.asarray(metadata["target_indices"], dtype=np.int64)
    limit = int(metadata["neighbor_limit"])

    vocabulary = np.asarray(embeddings[vocabulary_indices], dtype=np.float32)
    vocabulary /= np.maximum(np.linalg.norm(vocabulary, axis=1, keepdims=True), 1e-12)
    targets = np.asarray(embeddings[target_indices], dtype=np.float32)
    targets /= np.maximum(np.linalg.norm(targets, axis=1, keepdims=True), 1e-12)

    with open(output_path, "wb") as output:
        for target in targets:
            similarities = vocabulary @ target
            nearest = np.argpartition(-similarities, limit - 1)[:limit]
            nearest = nearest[np.argsort(-similarities[nearest], kind="stable")]
            output.write(np.asarray(nearest, dtype="<u2").tobytes())


if __name__ == "__main__":
    main()

