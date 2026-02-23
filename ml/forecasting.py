"""
Earthquake Forecasting System
Provides time-based forecasting, hotspot analysis, and proximity alerts
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import psycopg2
from scipy.stats import poisson
from sklearn.cluster import DBSCAN
from math import radians, cos, sin, asin, sqrt


class EarthquakeForecastingSystem:
    """
    Advanced earthquake forecasting system with multiple analysis capabilities
    """
    
    def __init__(self, db_config=None):
        """
        Initialize the forecasting system
        
        Args:
            db_config (dict): Database configuration
        """
        if db_config is None:
            db_config = {
                'host': 'localhost',
                'database': 'sismicity',
                'user': 'postgres',
                'password': 'bhupin85'
            }
        
        self.db_config = db_config
        self.poisson_rates = {}
        self.historical_data = None
        
    def load_historical_data(self, days_back=365):
        """
        Load historical earthquake data from database
        
        Args:
            days_back (int): Number of days of historical data to load
            
        Returns:
            pd.DataFrame: Historical earthquake data
        """
        try:
            conn = psycopg2.connect(**self.db_config)
            
            query = f"""
            SELECT dt, mag, depth, lat, lon, place, is_major
            FROM std_sismicity
            WHERE dt >= NOW() - INTERVAL '{days_back} days'
            ORDER BY dt DESC;
            """
            
            df = pd.read_sql(query, conn)
            conn.close()
            
            if not df.empty:
                # Convert datetime to UTC-aware
                df['dt'] = pd.to_datetime(df['dt'], utc=True)
                self.historical_data = df
                
            return df
            
        except Exception as e:
            print(f"Error loading historical data: {e}")
            return pd.DataFrame()
    
    def train_poisson_forecaster(self, df=None):
        """
        Train Poisson process models for different magnitude categories
        
        Args:
            df (pd.DataFrame): Historical earthquake data (optional, uses cached if None)
        """
        if df is None:
            df = self.historical_data
            
        if df is None or df.empty:
            return
        
        # Calculate observation period in days
        date_range = (df['dt'].max() - df['dt'].min()).days
        if date_range == 0:
            date_range = 1
        
        # Define magnitude categories
        categories = {
            'minor': (0, 4.0),
            'moderate': (4.0, 5.5),
            'major': (5.5, 10.0)
        }
        
        # Calculate rates for each category
        for category, (min_mag, max_mag) in categories.items():
            count = len(df[(df['mag'] >= min_mag) & (df['mag'] < max_mag)])
            rate = count / date_range  # events per day
            self.poisson_rates[category] = rate
    
    def forecast_next_events(self, days_ahead=7):
        """
        Forecast probability of earthquakes in the next N days
        
        Args:
            days_ahead (int): Number of days to forecast
            
        Returns:
            list: Forecast results for each category
        """
        if not self.poisson_rates:
            return []
        
        forecasts = []
        
        for category, rate in self.poisson_rates.items():
            # Expected number of events
            lambda_param = rate * days_ahead
            
            # Probability of at least one event: P(X >= 1) = 1 - P(X = 0)
            prob_at_least_one = (1 - poisson.pmf(0, lambda_param)) * 100
            
            # Expected count
            expected_count = lambda_param
            
            forecasts.append({
                'category': category.capitalize(),
                'expected_count': round(expected_count, 2),
                'probability': round(prob_at_least_one, 1),
                'days_ahead': days_ahead,
                'rate_per_day': round(rate, 2)
            })
        
        return forecasts
    
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate the great circle distance between two points on Earth
        
        Args:
            lat1, lon1: Coordinates of first point
            lat2, lon2: Coordinates of second point
            
        Returns:
            float: Distance in kilometers
        """
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Radius of Earth in kilometers
        r = 6371
        
        return c * r
    
    def identify_hotspots(self, df=None, eps_km=50, min_samples=5):
        """
        Identify seismic hotspots using DBSCAN clustering
        
        Args:
            df (pd.DataFrame): Earthquake data (optional, uses cached if None)
            eps_km (float): Maximum distance between events in a cluster (km)
            min_samples (int): Minimum events to form a hotspot
            
        Returns:
            list: Identified hotspots with statistics
        """
        if df is None:
            df = self.historical_data
            
        if df is None or df.empty or len(df) < min_samples:
            return []
        
        # Make a copy to avoid modifying original
        df = df.copy()
        
        # Prepare coordinates for clustering
        coords = df[['lat', 'lon']].values
        
        # Convert eps from km to degrees (approximate)
        eps_degrees = eps_km / 111.0  # 1 degree ≈ 111 km
        
        # Apply DBSCAN clustering
        clustering = DBSCAN(eps=eps_degrees, min_samples=min_samples, metric='haversine')
        
        # Convert to radians for haversine metric
        coords_rad = np.radians(coords)
        df['cluster'] = clustering.fit_predict(coords_rad)
        
        # Analyze each cluster
        hotspots = []
        
        for cluster_id in df['cluster'].unique():
            if cluster_id == -1:  # Skip noise points
                continue
            
            cluster_data = df[df['cluster'] == cluster_id]
            
            # Calculate hotspot statistics
            center_lat = cluster_data['lat'].mean()
            center_lon = cluster_data['lon'].mean()
            event_count = len(cluster_data)
            avg_magnitude = cluster_data['mag'].mean()
            max_magnitude = cluster_data['mag'].max()
            avg_depth = cluster_data['depth'].mean()
            
            # Calculate recent activity (last 30 days)
            recent_cutoff = pd.Timestamp.now(tz='UTC') - timedelta(days=30)
            recent_activity = len(cluster_data[cluster_data['dt'] > recent_cutoff])
            
            # Calculate radius of hotspot
            max_dist = 0
            for _, event in cluster_data.iterrows():
                dist = self.haversine_distance(
                    center_lat, center_lon,
                    event['lat'], event['lon']
                )
                max_dist = max(max_dist, dist)
            
            # Risk score (0-100)
            risk_score = min(100, (
                (event_count / 10) * 30 +  # Activity level
                (avg_magnitude / 7) * 40 +  # Average magnitude
                (recent_activity / max(event_count, 1)) * 30  # Recent activity ratio
            ))
            
            # Get representative location name
            location = cluster_data['place'].mode()[0] if not cluster_data['place'].empty else "Unknown"
            
            hotspots.append({
                'cluster_id': int(cluster_id),
                'center_lat': round(center_lat, 4),
                'center_lon': round(center_lon, 4),
                'event_count': event_count,
                'avg_magnitude': round(avg_magnitude, 2),
                'max_magnitude': round(max_magnitude, 1),
                'avg_depth': round(avg_depth, 1),
                'recent_activity': recent_activity,
                'radius_km': round(max_dist, 1),
                'risk_score': round(risk_score, 1),
                'location': location
            })
        
        # Sort by risk score
        hotspots.sort(key=lambda x: x['risk_score'], reverse=True)
        
        return hotspots
    
    def check_proximity_alert(self, user_lat, user_lon, radius_km=100, hours_back=24):
        """
        Check for recent earthquakes near a specific location
        
        Args:
            user_lat (float): User's latitude
            user_lon (float): User's longitude
            radius_km (float): Alert radius in kilometers
            hours_back (int): Hours to look back for events
            
        Returns:
            list: Nearby earthquakes with distance and severity
        """
        try:
            conn = psycopg2.connect(**self.db_config)
            
            # Query recent earthquakes
            query = f"""
            SELECT dt, mag, depth, lat, lon, place
            FROM std_sismicity
            WHERE dt >= NOW() - INTERVAL '{hours_back} hours'
            ORDER BY dt DESC;
            """
            
            df = pd.read_sql(query, conn)
            conn.close()
            
            if df.empty:
                return []
            
            # Convert to UTC-aware
            df['dt'] = pd.to_datetime(df['dt'], utc=True)
            
            # Calculate distance to each earthquake
            alerts = []
            
            now_utc = pd.Timestamp.now(tz='UTC')
            
            for _, event in df.iterrows():
                distance = self.haversine_distance(
                    user_lat, user_lon,
                    event['lat'], event['lon']
                )
                
                if distance <= radius_km:
                    # Determine severity
                    mag = event['mag']
                    
                    if mag >= 7.0:
                        severity = "CRITICAL"
                    elif mag >= 6.0:
                        severity = "SEVERE"
                    elif mag >= 5.5:
                        severity = "HIGH"
                    elif mag >= 4.0:
                        severity = "MODERATE"
                    elif mag >= 3.0:
                        severity = "LOW"
                    else:
                        severity = "MINIMAL"
                    
                    # Time since event
                    time_ago = now_utc - event['dt']
                    hours_ago = time_ago.total_seconds() / 3600
                    
                    alerts.append({
                        'datetime': event['dt'],
                        'magnitude': round(mag, 1),
                        'depth': round(event['depth'], 1),
                        'location': event['place'],
                        'distance_km': round(distance, 1),
                        'hours_ago': round(hours_ago, 1),
                        'severity': severity,
                        'lat': round(event['lat'], 4),
                        'lon': round(event['lon'], 4)
                    })
            
            # Sort by magnitude (most severe first)
            alerts.sort(key=lambda x: x['magnitude'], reverse=True)
            
            return alerts
            
        except Exception as e:
            print(f"Error checking proximity alerts: {e}")
            return []
    
    def generate_alert_message(self, alert):
        """
        Generate a human-readable alert message
        
        Args:
            alert (dict): Alert information
            
        Returns:
            str: Formatted alert message
        """
        severity_emoji = {
            'CRITICAL': '🔴',
            'SEVERE': '🟠',
            'HIGH': '🟡',
            'MODERATE': '🔵',
            'LOW': '🟢',
            'MINIMAL': '⚪'
        }
        
        emoji = severity_emoji.get(alert['severity'], '⚪')
        
        # Format time
        if alert['hours_ago'] < 1:
            time_str = f"{int(alert['hours_ago'] * 60)} minutes ago"
        elif alert['hours_ago'] < 24:
            time_str = f"{alert['hours_ago']:.1f} hours ago"
        else:
            time_str = f"{alert['hours_ago'] / 24:.1f} days ago"
        
        message = f"""{emoji} **{alert['severity']} ALERT**

**Magnitude:** M {alert['magnitude']:.1f}
**Location:** {alert['location']}
**Distance:** {alert['distance_km']:.1f} km from your location
**Depth:** {alert['depth']:.1f} km
**Time:** {time_str}"""
        
        return message.strip()
    
    def get_forecast_summary(self, days_ahead=7):
        """
        Get a formatted summary of earthquake forecast
        
        Args:
            days_ahead (int): Number of days to forecast
            
        Returns:
            str: Formatted forecast summary
        """
        forecasts = self.forecast_next_events(days_ahead)
        
        if not forecasts:
            return "⚠️ Forecasting system not initialized. Load historical data first."
        
        summary = f"## 🔮 **EARTHQUAKE FORECAST** (Next {days_ahead} days)\n\n"
        
        for f in forecasts:
            summary += f"**{f['category']} Earthquakes:**\n"
            summary += f"- Expected Count: {f['expected_count']:.1f} events\n"
            summary += f"- Probability: {f['probability']:.1f}%\n"
            summary += f"- Historical Rate: {f['rate_per_day']:.2f} events/day\n\n"
        
        return summary.strip()