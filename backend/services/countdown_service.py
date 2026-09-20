from typing import Dict, List
from urllib.parse import urlparse

from models.schemas import (
    CountdownEvidence,
    CountdownVerifyRequest,
    CountdownVerifyResponse,
)

# In-memory site reputation cache: domain -> list of past fakeness scores.
# This lets repeated visits/users on the same shady site converge to a
# confident verdict faster. Swap this dict for Redis/SQLite if you need
# it to survive process restarts or to share state across workers.
_site_reputation: Dict[str, List[float]] = {}

# How much each signal contributes to the fakeness score (0..1 scale).
# persisted_deadline_found is NEGATIVE: finding a real stored target
# timestamp is evidence the timer is genuine, so it reduces the score.
WEIGHTS = {
    "reset_on_reload": 0.5,
    "persisted_deadline_found": -0.3,
    "looped_or_jumped": 0.2,
    "no_consequence_at_zero": 0.2,
    "drift_mismatch": 0.3,
}

DRIFT_TOLERANCE_SECONDS = 5.0
CONFIDENCE_THRESHOLD = 0.5


class CountdownVerifierService:
    """Scores countdown-timer behavioral evidence sent by the extension
    and returns a dark-pattern verdict, matching the shape of the
    existing text/image predictor services."""

    def _domain_of(self, url: str) -> str:
        try:
            return urlparse(url).netloc.lower()
        except Exception:
            return url

    def _score_evidence(self, evidence: CountdownEvidence) -> float:
        score = 0.0

        if evidence.reset_on_reload:
            score += WEIGHTS["reset_on_reload"]
        if evidence.persisted_deadline_found:
            score += WEIGHTS["persisted_deadline_found"]
        if evidence.looped_or_jumped:
            score += WEIGHTS["looped_or_jumped"]
        if evidence.no_consequence_at_zero:
            score += WEIGHTS["no_consequence_at_zero"]

        # If we know both what remaining time SHOULD be (based on elapsed
        # wall-clock time) and what was actually observed, a big mismatch
        # is strong evidence the timer isn't tracking a real deadline.
        if (
            evidence.expected_remaining_seconds is not None
            and evidence.observed_remaining_seconds is not None
        ):
            drift = abs(
                evidence.expected_remaining_seconds
                - evidence.observed_remaining_seconds
            )
            if drift > DRIFT_TOLERANCE_SECONDS:
                score += WEIGHTS["drift_mismatch"]

        return max(0.0, min(score, 1.0))

    def _blend_with_site_reputation(self, domain: str, score: float) -> float:
        history = _site_reputation.setdefault(domain, [])
        history.append(score)

        if len(history) > 1:
            avg_history = sum(history) / len(history)
            score = (score * 0.7) + (avg_history * 0.3)

        return score

    def verify(self, request: CountdownVerifyRequest) -> CountdownVerifyResponse:
        raw_score = self._score_evidence(request.evidence)
        domain = self._domain_of(request.page_url)
        final_score = self._blend_with_site_reputation(domain, raw_score)
        is_fake = final_score >= CONFIDENCE_THRESHOLD

        return CountdownVerifyResponse(
            element_selector=request.element_selector,
            is_dark_pattern=is_fake,
            confidence=round(final_score, 3),
            evidence=request.evidence,
        )

    def verify_batch(
        self, requests: List[CountdownVerifyRequest]
    ) -> List[CountdownVerifyResponse]:
        return [self.verify(r) for r in requests]