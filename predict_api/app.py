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
import shap
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

# Initialize SHAP explainer for generating explanations
EXPLAINER = shap.TreeExplainer(MODEL)

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


def _generate_reasons(shap_values: np.ndarray, feature_values: np.ndarray, top_n: int = 3) -> tuple[list[str], list[dict[str, Any]]]:
    """Generate human-readable explanations from SHAP values.
    
    Args:
        shap_values: SHAP values for the prediction (1D array)
        feature_values: Feature values after imputation (1D array)
        top_n: Number of top features to include in explanations
        
    Returns:
        Tuple of (reasons, topShapFeatures) where:
        - reasons is a list of human-readable strings
        - topShapFeatures is a list of dicts with feature, shapValue, and value
    """
    # Get indices of features sorted by absolute SHAP value (descending)
    shap_abs_indices = np.argsort(np.abs(shap_values))[::-1]
    
    reasons: list[str] = []
    top_shap_features: list[dict[str, Any]] = []
    
    # Generate explanations for top features with positive contributions
    for idx in shap_abs_indices:
        if len(reasons) >= top_n:
            break
            
        shap_val = float(shap_values[idx])
        
        # Only include features that increase risk (positive SHAP values)
        if shap_val <= 0:
            continue
            
        feature_name = FEATURE_COLUMNS[idx]
        feature_val = float(feature_values[idx])
        feature_label = _label(feature_name)
        
        # Format the reason string
        reason = f"{feature_label} increased model risk (SHAP +{shap_val:.3f}; value {feature_val:.2f})"
        reasons.append(reason)
        
        top_shap_features.append({
            "feature": feature_name,
            "shapValue": shap_val,
            "value": feature_val,
        })
    
    return reasons, top_shap_features


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
    
    # Calculate SHAP values for this prediction
    shap_values = EXPLAINER.shap_values(imputed)
    
    # shap_values may be a list (one array per class) for binary classification
    # We want the SHAP values for the positive class (fraud = 1)
    if isinstance(shap_values, list):
        shap_values_fraud = shap_values[1][0]  # Class 1, first sample
    else:
        shap_values_fraud = shap_values[0]  # First sample
    
    # Generate human-readable reasons and top SHAP features
    reasons, top_shap_features = _generate_reasons(shap_values_fraud, imputed[0])
    
    return {
        "fraudProbability": probability,
        "providerRiskScore": score,
        "riskTier": risk_tier(score),
        "featuresUsed": len(supplied),
        "featuresImputed": len(FEATURE_COLUMNS) - len(supplied),
        "reasons": reasons,
        "topShapFeatures": top_shap_features,
    }
