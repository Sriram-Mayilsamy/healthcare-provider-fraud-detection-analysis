"""Tiny FastAPI scoring service for unseen provider feature vectors."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from risk_scoring import risk_score_from_probability, risk_tier

MODEL_DIR = ROOT / "outputs" / "model"

# Column order in outputs/test_provider_consolidated.csv
DATASET_COLUMNS = [
    "Provider",
    "TotalClaims",
    "InpatientClaims",
    "UniqueBeneficiaries",
    "FirstClaimDate",
    "LastClaimDate",
    "TotalMoneyClaimed",
    "AverageClaimAmount",
    "MaxPayout",
    "AnyClaimAfterDeath",
    "ClaimsAfterDeathCount",
    "TotalDeductible",
    "MeanDeductible",
    "MeanClaimDurationDays",
    "MeanAdmissionDurationDays",
    "MeanAgeAtClaim",
    "MeanDiagnosisCodeCount",
    "MeanProcedureCodeCount",
    "UniqueAttendingPhysicians",
    "UniqueOperatingPhysicians",
    "UniqueOtherPhysicians",
    "MeanGender",
    "MeanRace",
    "MeanPartACoverageMonths",
    "MeanPartBCoverageMonths",
    "MeanIPAnnualReimbursement",
    "MeanOPAnnualReimbursement",
    "OutpatientClaims",
    "InpatientClaimShare",
    "OutpatientClaimShare",
    "AverageVisitsPerBeneficiary",
    "Share_ChronicCond_Alzheimer",
    "Share_ChronicCond_Heartfailure",
    "Share_ChronicCond_KidneyDisease",
    "Share_ChronicCond_Cancer",
    "Share_ChronicCond_ObstrPulmonary",
    "Share_ChronicCond_Depression",
    "Share_ChronicCond_Diabetes",
    "Share_ChronicCond_IschemicHeart",
    "Share_ChronicCond_Osteoporasis",
    "Share_ChronicCond_rheumatoidarthritis",
    "Share_ChronicCond_stroke",
]
SKIP_COLUMNS = {"Provider", "FirstClaimDate", "LastClaimDate"}


def _load_artifacts() -> tuple[Any, Any, list[str]]:
    model_path = MODEL_DIR / "xgb_model.joblib"
    imputer_path = MODEL_DIR / "imputer.joblib"
    columns_path = MODEL_DIR / "feature_columns.json"
    if not model_path.exists() or not imputer_path.exists() or not columns_path.exists():
        raise FileNotFoundError(
            "Missing model artifacts. Run `python phase_3_risk_model.py` to train and save them."
        )
    model = joblib.load(model_path)
    imputer = joblib.load(imputer_path)
    feature_columns = json.loads(columns_path.read_text(encoding="utf-8"))
    return model, imputer, feature_columns


MODEL, IMPUTER, FEATURE_COLUMNS = _load_artifacts()
MEDIANS = {
    column: float(value)
    for column, value in zip(FEATURE_COLUMNS, IMPUTER.statistics_, strict=True)
    if pd.notna(value)
}

app = FastAPI(title="Provider Risk Predict", version="1.0.0")

# CORS configuration - supports both local development and production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _label(feature: str) -> str:
    return (
        feature.replace("Share_ChronicCond_", "")
        .replace("_", " ")
        .replace("Mean", "Mean ")
        .strip()
    )


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/predict/features")
def predict_features() -> dict[str, Any]:
    return {
        "datasetColumns": DATASET_COLUMNS,
        "features": [
            {
                "name": column,
                "label": _label(column),
                "kind": "skip" if column in SKIP_COLUMNS else "feature",
                "median": MEDIANS.get(column),
            }
            for column in DATASET_COLUMNS
        ],
        "scoring": {
            "probabilityToScore": "ProviderRiskScore = FraudProbability * 100",
            "tiers": {
                "Low Risk": "score <= 40",
                "Medium Risk": "40 < score <= 75",
                "High Risk": "score > 75",
            },
        },
    }


@app.post("/predict")
def predict(payload: dict[str, Any]) -> dict[str, Any]:
    unknown = sorted(set(payload) - set(FEATURE_COLUMNS))
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown features: {', '.join(unknown)}",
        )

    row: dict[str, float | None] = {}
    for column in FEATURE_COLUMNS:
        if column not in payload or payload[column] in ("", None):
            row[column] = None
            continue
        try:
            row[column] = float(payload[column])
        except (TypeError, ValueError) as error:
            raise HTTPException(
                status_code=422,
                detail=f"{column} must be numeric",
            ) from error

    vector = np.array(
        [[np.nan if row[column] is None else row[column] for column in FEATURE_COLUMNS]],
        dtype=float,
    )
    imputed = IMPUTER.transform(vector)
    probability = float(MODEL.predict_proba(imputed)[0, 1])
    score = risk_score_from_probability(probability)
    supplied = [column for column in FEATURE_COLUMNS if row[column] is not None]
    return {
        "fraudProbability": probability,
        "providerRiskScore": score,
        "riskTier": risk_tier(score),
        "featuresUsed": len(supplied),
        "featuresImputed": len(FEATURE_COLUMNS) - len(supplied),
    }
