"""Content-quality checks that read node TEXT, not just node TAGS.

Every metric elsewhere in this pipeline (block Jaccard, H1-H5, coverage floor,
role-mix monotonicity) verifies that Gemini attached the correct label the
correct number of times. None of them verify the label is actually TRUE of
the content — that a node tagged scaffolding_catchup really is simpler and
more supportive than a node tagged core_required next to it. This module
checks that, using a local sentence-embedding model (no API cost, no LLM
judge, deterministic, free to run at any scale) plus a lightweight
readability proxy that needs no extra dependency.
"""

from __future__ import annotations

import re
from typing import Any

import numpy as np

_MODEL = None


def _get_model():
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer

        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _MODEL


def node_text(node: dict[str, Any]) -> str:
    return f"{node.get('title', '')}. {node.get('description', '')}".strip()


def embed(texts: list[str]) -> np.ndarray:
    model = _get_model()
    return np.asarray(model.encode(list(texts), normalize_embeddings=True))


def mean_pairwise_similarity(texts: list[str]) -> float | None:
    """Average cosine similarity across all pairs. Low = textually diverse,
    high = near-duplicate/templated content."""
    if len(texts) < 2:
        return None
    embeddings = embed(texts)
    sims = embeddings @ embeddings.T
    n = len(texts)
    iu = np.triu_indices(n, k=1)
    return float(sims[iu].mean())


def pairwise_similarity(text_a: str, text_b: str) -> float:
    embeddings = embed([text_a, text_b])
    return float(embeddings[0] @ embeddings[1])


def _count_syllables(word: str) -> int:
    word = word.lower()
    vowels = "aeiouy"
    count = 0
    prev_was_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_was_vowel:
            count += 1
        prev_was_vowel = is_vowel
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)


def flesch_reading_ease(text: str) -> float | None:
    """Higher = easier to read. Standard formula, approximate syllable count
    (vowel-group heuristic — no extra dependency needed for this proxy)."""
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    words = re.findall(r"[A-Za-z']+", text)
    if not sentences or not words:
        return None
    syllables = sum(_count_syllables(w) for w in words)
    n_sentences, n_words = len(sentences), len(words)
    return 206.835 - 1.015 * (n_words / n_sentences) - 84.6 * (syllables / n_words)
