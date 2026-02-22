#!/usr/bin/env python3
"""
Generate forecasts for rural credit data using ML models.
Generates forecasts.json for the dashboard.

Models: XGBoost, LightGBM, RandomForest
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, r2_score

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("Warning: XGBoost not available")

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("Warning: LightGBM not available")

# Directories
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "dashboard" / "public" / "data"
OUTPUT_FILE = DATA_DIR / "forecasts.json"

# Configuration
FORECAST_HORIZON = 24  # months
TEST_SIZE = 12  # months for validation
RANDOM_STATE = 42


def load_aggregated_data() -> dict:
    """Load aggregated.json data."""
    filepath = DATA_DIR / "aggregated.json"
    if not filepath.exists():
        raise FileNotFoundError(f"aggregated.json not found at {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create time series features for ML models."""
    df = df.copy()

    # Lag features
    for lag in [1, 2, 3, 6, 12]:
        df[f'lag_{lag}'] = df['valor'].shift(lag)

    # Rolling statistics
    for window in [3, 6, 12]:
        df[f'rolling_mean_{window}'] = df['valor'].rolling(window=window).mean()
        df[f'rolling_std_{window}'] = df['valor'].rolling(window=window).std()

    # Seasonal features (if monthly data)
    if 'mes' in df.columns:
        df['month'] = df['mes']
        df['month_sin'] = np.sin(2 * np.pi * df['mes'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['mes'] / 12)

    # Trend feature
    df['trend'] = np.arange(len(df))

    # Year feature
    if 'ano' in df.columns:
        df['year'] = df['ano']

    return df


def prepare_series_data(data: dict, serie: str = 'total') -> pd.DataFrame:
    """Prepare time series data for a specific serie."""

    if serie == 'total':
        # Use monthly data if available, otherwise annual
        if data.get('byMes') and len(data['byMes']) > 0:
            df = pd.DataFrame(data['byMes'])
        elif data.get('byAno') and len(data['byAno']) > 0:
            df = pd.DataFrame(data['byAno'])
            df['mes'] = 6  # Mid-year for annual data
        else:
            return pd.DataFrame()
    elif serie in ['custeio', 'investimento', 'comercializacao']:
        # Filter by finalidade - prefer monthly data for better forecasting
        if data.get('byFinalidadeMes') and len(data['byFinalidadeMes']) > 0:
            df = pd.DataFrame(data['byFinalidadeMes'])
            df = df[df['finalidade'].str.upper() == serie.upper()]
        elif data.get('byFinalidade'):
            df = pd.DataFrame(data['byFinalidade'])
            df = df[df['finalidade'].str.upper() == serie.upper()]
            df['mes'] = 6  # Mid-year for annual data
        else:
            return pd.DataFrame()
    else:
        return pd.DataFrame()

    if df.empty:
        return df

    # Ensure numeric columns
    for col in ['valor', 'contratos', 'area']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # Sort by time
    sort_cols = ['ano'] + (['mes'] if 'mes' in df.columns else [])
    df = df.sort_values(sort_cols).reset_index(drop=True)

    return df


def train_xgboost(X_train: np.ndarray, y_train: np.ndarray) -> Any:
    """Train XGBoost model."""
    if not HAS_XGBOOST:
        return None

    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=RANDOM_STATE,
        verbosity=0,
    )
    model.fit(X_train, y_train)
    return model


def train_lightgbm(X_train: np.ndarray, y_train: np.ndarray) -> Any:
    """Train LightGBM model."""
    if not HAS_LIGHTGBM:
        return None

    model = lgb.LGBMRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=RANDOM_STATE,
        verbose=-1,
    )
    model.fit(X_train, y_train)
    return model


def train_randomforest(X_train: np.ndarray, y_train: np.ndarray) -> Any:
    """Train Random Forest model."""
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=6,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def generate_future_features(df: pd.DataFrame, horizon: int, feature_cols: List[str]) -> pd.DataFrame:
    """Generate features for future periods."""
    last_row = df.iloc[-1]
    last_ano = int(last_row['ano'])
    last_mes = int(last_row.get('mes', 12))

    future_rows = []

    # Copy last known values for rolling calculations
    recent_values = df['valor'].tail(12).tolist()

    for h in range(1, horizon + 1):
        # Calculate future month/year
        future_mes = (last_mes + h - 1) % 12 + 1
        future_ano = last_ano + (last_mes + h - 1) // 12

        row = {
            'ano': future_ano,
            'mes': future_mes,
            'trend': len(df) + h - 1,
            'year': future_ano,
            'month': future_mes,
            'month_sin': np.sin(2 * np.pi * future_mes / 12),
            'month_cos': np.cos(2 * np.pi * future_mes / 12),
        }

        # Lag features (use recent values)
        for lag in [1, 2, 3, 6, 12]:
            idx = len(recent_values) - lag
            row[f'lag_{lag}'] = recent_values[idx] if idx >= 0 else np.mean(recent_values)

        # Rolling features
        for window in [3, 6, 12]:
            window_vals = recent_values[-window:] if len(recent_values) >= window else recent_values
            row[f'rolling_mean_{window}'] = np.mean(window_vals)
            row[f'rolling_std_{window}'] = np.std(window_vals) if len(window_vals) > 1 else 0

        future_rows.append(row)

        # Simulate predicted value for next iteration (use last known value as placeholder)
        recent_values.append(recent_values[-1])

    return pd.DataFrame(future_rows)


def calculate_confidence_intervals(predictions: np.ndarray, model: Any, X: np.ndarray) -> Dict[str, np.ndarray]:
    """Calculate confidence intervals for predictions."""
    # For tree-based models, we can use prediction variance
    # Simple approach: use historical residual std
    std = np.std(predictions) * 0.15  # Approximate uncertainty

    return {
        'lower_80': predictions - 1.28 * std,
        'upper_80': predictions + 1.28 * std,
        'lower_95': predictions - 1.96 * std,
        'upper_95': predictions + 1.96 * std,
    }


def forecast_series(df: pd.DataFrame, model_name: str) -> Dict[str, Any]:
    """Generate forecast for a time series using specified model."""
    if df.empty or len(df) < 24:
        return {'error': 'Insufficient data'}

    # Create features
    df_feat = create_features(df)
    df_feat = df_feat.dropna()

    if len(df_feat) < 12:
        return {'error': 'Insufficient data after feature creation'}

    # Feature columns
    feature_cols = [c for c in df_feat.columns if c not in ['valor', 'contratos', 'area', 'finalidade', 'programa', 'produto']]

    # Split data
    X = df_feat[feature_cols].values
    y = df_feat['valor'].values

    # Train/test split
    split_idx = len(X) - min(TEST_SIZE, len(X) // 4)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # Train model
    if model_name == 'xgboost':
        model = train_xgboost(X_train, y_train)
    elif model_name == 'lightgbm':
        model = train_lightgbm(X_train, y_train)
    else:  # randomforest
        model = train_randomforest(X_train, y_train)

    if model is None:
        return {'error': f'{model_name} not available'}

    # Evaluate on test set
    y_pred_test = model.predict(X_test)

    metrics = {
        'mape': float(mean_absolute_percentage_error(y_test, y_pred_test) * 100),
        'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred_test))),
        'r2': float(r2_score(y_test, y_pred_test)),
    }

    # Generate future predictions
    future_df = generate_future_features(df_feat, FORECAST_HORIZON, feature_cols)
    X_future = future_df[feature_cols].values
    predictions = model.predict(X_future)

    # Confidence intervals
    ci = calculate_confidence_intervals(predictions, model, X_future)

    # Format predictions
    formatted_predictions = []
    for i, row in future_df.iterrows():
        formatted_predictions.append({
            'ano': int(row['ano']),
            'mes': int(row['mes']),
            'valor': float(max(0, predictions[i])),
            'lower_80': float(max(0, ci['lower_80'][i])),
            'upper_80': float(max(0, ci['upper_80'][i])),
            'lower_95': float(max(0, ci['lower_95'][i])),
            'upper_95': float(max(0, ci['upper_95'][i])),
        })

    return {
        'predictions': formatted_predictions,
        'metrics': metrics,
        'mape': metrics['mape'],
        'rmse': metrics['rmse'],
        'r2': metrics['r2'],
    }


def main():
    """Main function to generate all forecasts."""
    print("=" * 60)
    print("Forecast Generator - Credito Rural Parana")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Load data
    print("\nLoading aggregated data...")
    try:
        data = load_aggregated_data()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    # Series to forecast
    series = ['total', 'custeio', 'investimento', 'comercializacao']
    models = ['xgboost', 'lightgbm', 'randomforest']

    # Check available models
    available_models = []
    if HAS_XGBOOST:
        available_models.append('xgboost')
    if HAS_LIGHTGBM:
        available_models.append('lightgbm')
    available_models.append('randomforest')  # Always available

    print(f"Available models: {', '.join(available_models)}")

    # Generate forecasts
    forecasts = {}

    for serie in series:
        print(f"\nProcessing serie: {serie}")
        forecasts[serie] = {}

        # Prepare data
        df = prepare_series_data(data, serie)

        if df.empty:
            print(f"  Warning: No data for serie {serie}")
            continue

        print(f"  Data points: {len(df)}")

        for model_name in available_models:
            print(f"  Training {model_name}...")
            result = forecast_series(df.copy(), model_name)

            if 'error' in result:
                print(f"    Error: {result['error']}")
            else:
                print(f"    MAPE: {result['mape']:.2f}%, R2: {result['r2']:.3f}")

            forecasts[serie][model_name] = result

    # Save forecasts
    print("\nSaving forecasts.json...")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(forecasts, f, ensure_ascii=False, indent=2)

    print(f"Saved to {OUTPUT_FILE}")
    print(f"File size: {OUTPUT_FILE.stat().st_size / 1024:.1f} KB")

    print("\n" + "=" * 60)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
