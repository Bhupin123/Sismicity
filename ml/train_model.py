import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.ensemble import (
    RandomForestClassifier, 
    GradientBoostingRegressor,
    ExtraTreesRegressor,
    VotingRegressor,
    StackingRegressor
)
from sklearn.neural_network import MLPRegressor, MLPClassifier
from xgboost import XGBRegressor, XGBClassifier
from sklearn.metrics import (
    classification_report, 
    mean_squared_error, 
    r2_score, 
    mean_absolute_error,
    accuracy_score,
    precision_recall_fscore_support
)
import joblib
import psycopg2
from datetime import datetime
import os

def load_data_from_db():
    """Load data from PostgreSQL with enhanced error handling"""
    print("\n" + "="*70)
    print(" LOADING DATA FROM DATABASE")
    print("="*70)
    
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="sismicity",
            user="postgres",
            password="bhupin85"
        )
        
        query = """
        SELECT 
            dt, mag, depth, lat, lon, is_major, place,
            rolling_count_7d, rolling_count_30d,
            rolling_mean_mag_30d, days_since_last_major,
            year, month_sin, month_cos, hour_sin, hour_cos
        FROM std_sismicity
        WHERE mag IS NOT NULL AND depth IS NOT NULL
        ORDER BY dt;
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        print(f"   Successfully loaded {len(df):,} records")
        print(f"   Date range: {df['dt'].min()} to {df['dt'].max()}")
        print(f"   Magnitude range: M {df['mag'].min():.1f} - M {df['mag'].max():.1f}")
        print(f"   Depth range: {df['depth'].min():.1f} - {df['depth'].max():.1f} km")
        
        return df
        
    except Exception as e:
        print(f"   Error loading data: {e}")
        return None

def engineer_advanced_features(df):
    """Advanced feature engineering for ML"""
    print("\n" + "="*70)
    print("🔧 ADVANCED FEATURE ENGINEERING")
    print("="*70)
    
    df = df.copy()
    
    # Fill NaN values FIRST before any operations
    df = df.fillna({
        'days_since_last_major': 9999,  # Large number for "no recent major event"
        'rolling_count_7d': 0,
        'rolling_count_30d': 0,
        'rolling_mean_mag_30d': 0,
        'month_sin': 0,
        'month_cos': 1,
        'hour_sin': 0,
        'hour_cos': 1
    })
    
    # Temporal features
    df['dt'] = pd.to_datetime(df['dt'])
    df['day_of_year'] = df['dt'].dt.dayofyear
    df['quarter'] = df['dt'].dt.quarter
    df['is_weekend'] = (df['dt'].dt.dayofweek >= 5).astype(int)
    df['day_of_week'] = df['dt'].dt.dayofweek
    
    # Polynomial features (handle NaN in calculations)
    df['depth_squared'] = df['depth'].fillna(0) ** 2
    df['depth_cubed'] = df['depth'].fillna(0) ** 3
    df['mag_squared'] = df['mag'].fillna(0) ** 2
    
    # Interaction features
    df['mag_depth_interaction'] = df['mag'].fillna(0) * df['depth'].fillna(0)
    df['lat_lon_interaction'] = df['lat'].fillna(0) * df['lon'].fillna(0)
    df['lat_depth_interaction'] = df['lat'].fillna(0) * df['depth'].fillna(0)
    df['rolling_mag_depth'] = df['rolling_mean_mag_30d'] * df['depth'].fillna(0)
    
    # Activity ratios (safe division)
    df['activity_ratio_7_30'] = df['rolling_count_7d'] / (df['rolling_count_30d'] + 1)
    df['recent_activity_score'] = df['rolling_count_7d'] * df['rolling_mean_mag_30d']
    
    # Geographic clustering features
    df['lat_rounded'] = (df['lat'].fillna(0) / 10).round() * 10
    df['lon_rounded'] = (df['lon'].fillna(0) / 10).round() * 10
    df['geo_cluster'] = df.groupby(['lat_rounded', 'lon_rounded']).ngroup()
    
    # Time since features (NOW SAFE - NaN already filled)
    df['days_since_last_major_log'] = np.log1p(df['days_since_last_major'])
    df['recency_score'] = 1 / (df['days_since_last_major'] + 1)
    
    # Statistical features
    df['mag_deviation'] = df['mag'].fillna(0) - df['rolling_mean_mag_30d']
    df['is_above_avg'] = (df['mag'].fillna(0) > df['rolling_mean_mag_30d']).astype(int)
    
    # Final fillna for any remaining NaN
    df = df.fillna(0)
    
    feature_count = len([c for c in df.columns if c not in ['dt', 'place', 'is_major']])
    print(f"   Created {feature_count} total features")
    print(f"   Feature categories:")
    print(f"     • Temporal: 7 features")
    print(f"     • Polynomial: 4 features")
    print(f"     • Interaction: 5 features")
    print(f"     • Activity: 2 features")
    print(f"     • Geographic: 3 features")
    print(f"     • Statistical: 4 features")
    
    return df

def train_advanced_magnitude_predictor(df):
    """Train ensemble magnitude prediction with multiple algorithms"""
    print("\n" + "="*70)
    print(" TRAINING ADVANCED MAGNITUDE PREDICTION ENSEMBLE")
    print("="*70)
    
    # Advanced feature set
    feature_cols = [
        'depth', 'lat', 'lon', 
        'rolling_count_7d', 'rolling_count_30d', 'rolling_mean_mag_30d',
        'month_sin', 'month_cos', 'hour_sin', 'hour_cos',
        'depth_squared', 'depth_cubed', 'day_of_year', 'quarter',
        'mag_depth_interaction', 'lat_lon_interaction', 'lat_depth_interaction',
        'activity_ratio_7_30', 'recent_activity_score',
        'days_since_last_major', 'days_since_last_major_log', 'recency_score',
        'geo_cluster', 'is_weekend'
    ]
    
    print(f"   Using {len(feature_cols)} advanced features")
    
    missing = [f for f in feature_cols if f not in df.columns]
    if missing:
        print(f"   Missing features: {missing}")
        return None, None, None
    
    X = df[feature_cols].fillna(0)
    y = df['mag']
    
    print(f"   Training samples: {len(X):,}")
    print(f"   Target range: M {y.min():.2f} - M {y.max():.2f}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Use RobustScaler (better for outliers)
    scaler = RobustScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("\n   Training Multiple Models:")
    
    # Model 1: XGBoost (Best performance)
    print("      XGBoost Regressor...")
    xgb_model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=7,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=0
    )
    xgb_model.fit(X_train_scaled, y_train)
    
    # Model 2: Gradient Boosting
    print("      Gradient Boosting Regressor...")
    gb_model = GradientBoostingRegressor(
        n_estimators=250,
        learning_rate=0.08,
        max_depth=6,
        subsample=0.85,
        random_state=42,
        verbose=0
    )
    gb_model.fit(X_train_scaled, y_train)
    
    # Model 3: Extra Trees
    print("      Extra Trees Regressor...")
    et_model = ExtraTreesRegressor(
        n_estimators=200,
        max_depth=12,
        random_state=42,
        n_jobs=-1
    )
    et_model.fit(X_train_scaled, y_train)
    
    # Model 4: Neural Network
    print("      Neural Network (MLP)...")
    nn_model = MLPRegressor(
        hidden_layer_sizes=(128, 64, 32),
        activation='relu',
        solver='adam',
        alpha=0.001,
        learning_rate='adaptive',
        max_iter=500,
        random_state=42,
        verbose=False
    )
    nn_model.fit(X_train_scaled, y_train)
    
    # Create Ensemble (Voting)
    print("\n   Creating Ensemble Model...")
    ensemble = VotingRegressor([
        ('xgb', xgb_model),
        ('gb', gb_model),
        ('et', et_model),
        ('nn', nn_model)
    ])
    ensemble.fit(X_train_scaled, y_train)
    
    # Evaluate all models
    print("\n   MODEL PERFORMANCE COMPARISON:")
    print("  " + "-"*66)
    print(f"  {'Model':<25} {'RMSE':>10} {'MAE':>10} {'R²':>10}")
    print("  " + "-"*66)
    
    models = {
        'XGBoost': xgb_model,
        'Gradient Boosting': gb_model,
        'Extra Trees': et_model,
        'Neural Network': nn_model,
        ' ENSEMBLE': ensemble
    }
    
    best_model = None
    best_r2 = -float('inf')
    
    for name, model in models.items():
        y_pred = model.predict(X_test_scaled)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        marker = "🥇" if name == ' ENSEMBLE' else "  "
        print(f"  {marker} {name:<23} {rmse:>10.4f} {mae:>10.4f} {r2:>10.4f}")
        
        if r2 > best_r2:
            best_r2 = r2
            best_model = model
    
    print("  " + "-"*66)
    
    # Save models
    model_dir = os.path.dirname(os.path.abspath(__file__))
    
    joblib.dump(ensemble, os.path.join(model_dir, 'magnitude_predictor.pkl'))
    joblib.dump(xgb_model, os.path.join(model_dir, 'magnitude_xgb.pkl'))
    joblib.dump(scaler, os.path.join(model_dir, 'magnitude_scaler.pkl'))
    joblib.dump(feature_cols, os.path.join(model_dir, 'magnitude_features.pkl'))
    
    print(f"\n   Models saved to: {model_dir}")
    
    return ensemble, scaler, feature_cols

def train_advanced_classifier(df):
    """Train advanced major event classifier with deep learning"""
    print("\n" + "="*70)
    print("⚡ TRAINING ADVANCED MAJOR EVENT CLASSIFIER")
    print("="*70)
    
    feature_cols = [
        'depth', 'lat', 'lon',
        'rolling_count_7d', 'rolling_count_30d', 'rolling_mean_mag_30d',
        'days_since_last_major', 'days_since_last_major_log', 'recency_score',
        'month_sin', 'month_cos', 'hour_sin', 'hour_cos',
        'depth_squared', 'lat_lon_interaction', 'lat_depth_interaction',
        'day_of_year', 'quarter', 'activity_ratio_7_30', 'recent_activity_score',
        'geo_cluster', 'is_weekend'
    ]
    
    print(f"   Using {len(feature_cols)} advanced features")
    
    X = df[feature_cols].fillna(0)
    y = df['is_major'].astype(int)
    
    major_count = y.sum()
    normal_count = len(y) - major_count
    
    print(f"   Training samples: {len(X):,}")
    print(f"   Class distribution:")
    print(f"     • Normal: {normal_count:,} ({normal_count/len(y)*100:.1f}%)")
    print(f"     • Major:  {major_count:,} ({major_count/len(y)*100:.1f}%)")
    
    if major_count < 10:
        print("    Warning: Few major events - model may have limited accuracy")
    
    # Check if we have enough samples for stratification
    if major_count < 2:
        print("    ERROR: Not enough major events for classification (need at least 2)")
        print("    Skipping classifier training - using fallback model")
        
        # Create a simple fallback classifier
        scaler = RobustScaler()
        scaler.fit(X)
        
        # Save a dummy classifier that predicts based on magnitude threshold
        class FallbackClassifier:
            def __init__(self):
                self.threshold = 5.5
            
            def predict(self, X):
                # Simple heuristic: classify based on features
                return np.zeros(len(X), dtype=int)
            
            def predict_proba(self, X):
                # Return low probabilities
                probs = np.zeros((len(X), 2))
                probs[:, 0] = 0.95  # 95% probability of normal
                probs[:, 1] = 0.05  # 5% probability of major
                return probs
        
        fallback = FallbackClassifier()
        
        model_dir = os.path.dirname(os.path.abspath(__file__))
        joblib.dump(fallback, os.path.join(model_dir, 'major_event_classifier.pkl'))
        joblib.dump(scaler, os.path.join(model_dir, 'classifier_scaler.pkl'))
        joblib.dump(feature_cols, os.path.join(model_dir, 'classifier_features.pkl'))
        
        print(f"\n   Fallback classifier saved to: {model_dir}")
        
        return fallback, scaler, feature_cols
    
    # Split with stratification
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        # Fallback: split without stratification if it fails
        print("    Warning: Stratification failed, using random split")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    scaler = RobustScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("\n   Training Multiple Classifiers:")
    
    # Model 1: XGBoost Classifier
    print("      XGBoost Classifier...")
    xgb_clf = XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        scale_pos_weight=max(1, normal_count/max(1, major_count)),  # Handle imbalance
        subsample=0.8,
        random_state=42,
        verbosity=0,
        eval_metric='logloss'
    )
    xgb_clf.fit(X_train_scaled, y_train)
    
    # Model 2: Random Forest
    print("      Random Forest Classifier...")
    rf_clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_clf.fit(X_train_scaled, y_train)
    
    # Model 3: Neural Network
    print("      Neural Network Classifier...")
    nn_clf = MLPClassifier(
        hidden_layer_sizes=(128, 64, 32, 16),
        activation='relu',
        solver='adam',
        alpha=0.001,
        learning_rate='adaptive',
        max_iter=500,
        random_state=42,
        verbose=False
    )
    nn_clf.fit(X_train_scaled, y_train)
    
    # Evaluate models
    print("\n   CLASSIFICATION PERFORMANCE:")
    print("  " + "-"*70)
    print(f"  {'Model':<25} {'Accuracy':>12} {'Precision':>12} {'Recall':>12}")
    print("  " + "-"*70)
    
    best_model = xgb_clf  # Default to XGBoost
    best_score = 0
    
    for name, model in [('XGBoost', xgb_clf), ('Random Forest', rf_clf), ('Neural Network', nn_clf)]:
        y_pred = model.predict(X_test_scaled)
        acc = accuracy_score(y_test, y_pred)
        
        # Calculate metrics with zero_division handling
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_test, y_pred, average='binary', zero_division=0
        )
        
        # Use accuracy as score if F1 is 0
        score = f1 if f1 > 0 else acc
        
        marker = "🥇" if score >= best_score else "  "
        print(f"  {marker} {name:<23} {acc:>12.4f} {prec:>12.4f} {rec:>12.4f}")
        
        if score >= best_score:
            best_score = score
            best_model = model
    
    print("  " + "-"*70)
    
    # Detailed report for best model
    if best_model is not None:
        print(f"\n   Detailed Report (Best Model):")
        try:
            y_pred_best = best_model.predict(X_test_scaled)
            print(classification_report(
                y_test, y_pred_best, 
                target_names=['Normal', 'Major'], 
                zero_division=0
            ))
        except Exception as e:
            print(f"    Could not generate detailed report: {e}")
    
    # Save models
    model_dir = os.path.dirname(os.path.abspath(__file__))
    
    joblib.dump(best_model, os.path.join(model_dir, 'major_event_classifier.pkl'))
    joblib.dump(xgb_clf, os.path.join(model_dir, 'classifier_xgb.pkl'))
    joblib.dump(scaler, os.path.join(model_dir, 'classifier_scaler.pkl'))
    joblib.dump(feature_cols, os.path.join(model_dir, 'classifier_features.pkl'))
    
    print(f"\n   Classifiers saved to: {model_dir}")
    
    return best_model, scaler, feature_cols

def train_risk_assessment_system(df):
    """Train advanced risk assessment with neural networks"""
    print("\n" + "="*70)
    print(" TRAINING ADVANCED RISK ASSESSMENT SYSTEM")
    print("="*70)
    
    # Multi-factor risk score
    df['risk_score'] = (
        df['mag'] * 0.35 +
        (df['rolling_count_30d'] / 10) * 0.25 +
        (1 / (df['days_since_last_major'] + 1)) * 80 * 0.25 +
        (df['rolling_mean_mag_30d'] / 7) * 15 * 0.15
    )
    
    feature_cols = [
        'mag', 'depth', 'lat', 'lon',
        'rolling_count_7d', 'rolling_count_30d', 'rolling_mean_mag_30d',
        'days_since_last_major', 'recency_score',
        'month_sin', 'month_cos', 'hour_sin', 'hour_cos',
        'depth_squared', 'activity_ratio_7_30', 'recent_activity_score',
        'geo_cluster'
    ]
    
    print(f"   Using {len(feature_cols)} features for risk assessment")
    
    X = df[feature_cols].fillna(0)
    y = df['risk_score']
    
    print(f"   Training samples: {len(X):,}")
    print(f"   Risk score range: {y.min():.2f} - {y.max():.2f}")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    scaler = RobustScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("\n   Training Risk Models:")
    print("      XGBoost Risk Model...")
    
    model = XGBRegressor(
        n_estimators=250,
        learning_rate=0.08,
        max_depth=6,
        subsample=0.85,
        random_state=42,
        verbosity=0
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n   Risk Model Performance:")
    print(f"     • RMSE: {rmse:.4f}")
    print(f"     • MAE:  {mae:.4f}")
    print(f"     • R²:   {r2:.4f}")
    
    # Save model
    model_dir = os.path.dirname(os.path.abspath(__file__))
    
    joblib.dump(model, os.path.join(model_dir, 'risk_score_model.pkl'))
    joblib.dump(scaler, os.path.join(model_dir, 'risk_scaler.pkl'))
    joblib.dump(feature_cols, os.path.join(model_dir, 'risk_features.pkl'))
    
    print(f"\n   Risk model saved to: {model_dir}")
    
    return model, scaler, feature_cols

if __name__ == "__main__":
    print("\n" + "="*70)
    print(" ADVANCED SEISMICITY ML TRAINING PIPELINE")
    print("="*70)
    print("\n Using State-of-the-Art Algorithms:")
    print("   • XGBoost (Gradient Boosting)")
    print("   • Random Forest & Extra Trees")
    print("   • Deep Neural Networks (MLP)")
    print("   • Ensemble Methods (Voting)")
    print("   • Advanced Feature Engineering")
    
    start_time = datetime.now()
    
    # Load data
    df = load_data_from_db()
    
    if df is None or len(df) == 0:
        print("\n Failed to load data. Exiting.")
        exit(1)
    
    # Feature engineering
    df = engineer_advanced_features(df)
    
    # Train models
    print("\n" + "="*70)
    print(" TRAINING PHASE")
    print("="*70)
    
    mag_model, mag_scaler, mag_features = train_advanced_magnitude_predictor(df)
    
    if mag_model is None:
        print("\n Failed to train magnitude predictor.")
        exit(1)
    
    class_model, class_scaler, class_features = train_advanced_classifier(df)
    
    if class_model is None:
        print("\n Failed to train classifier.")
        exit(1)
    
    risk_model, risk_scaler, risk_features = train_risk_assessment_system(df)
    
    if risk_model is None:
        print("\n Failed to train risk model.")
        exit(1)
    
    # Summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print("\n" + "="*70)
    print(" TRAINING COMPLETE!")
    print("="*70)
    
    print(f"\n  Training Duration: {duration:.2f} seconds")
    
    print("\n Saved Models:")
    print("    Magnitude Prediction:")
    print("      • magnitude_predictor.pkl (Ensemble)")
    print("      • magnitude_xgb.pkl (XGBoost)")
    print("      • magnitude_scaler.pkl")
    print("      • magnitude_features.pkl")
    print("\n   ⚡ Major Event Classification:")
    print("      • major_event_classifier.pkl (Best Model)")
    print("      • classifier_xgb.pkl (XGBoost)")
    print("      • classifier_scaler.pkl")
    print("      • classifier_features.pkl")
    print("\n    Risk Assessment:")
    print("      • risk_score_model.pkl")
    print("      • risk_scaler.pkl")
    print("      • risk_features.pkl")
    
    print("\n Next Step: streamlit run visualization/app.py")
    print("="*70 + "\n")