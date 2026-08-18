"""Shared 0-100 risk score rules used by training and the live predict API."""

from __future__ import annotations


def risk_score_from_probability(probability: float) -> float:
    """Same transform as phase_3_risk_model: ProviderRiskScore = FraudProbability * 100."""
    return float(probability) * 100.0


def risk_tier(score: float) -> str:
    if score <= 40:
        return "Low Risk"
    if score <= 75:
        return "Medium Risk"
    return "High Risk"
