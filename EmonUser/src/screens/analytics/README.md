# Analytics Screen Refactor

## Overview
The Analytics screen has been refactored to follow the same modular structure as the Dashboard and Appliances screens, with improved functionality and real user data integration.

## Structure

### Managers
- **AnalyticsDataManager.ts**: Handles all data operations, sensor data processing, and chart data generation using real sensor readings instead of mock data.

### Utils
- **AnalyticsCalculator.ts**: Contains utility functions for efficiency calculations, analysis text generation, recommendations, and chart formatting.

### Components
- **TimePeriodSelector.tsx**: Time period selection buttons (Realtime, Daily, Weekly, Monthly)
- **SummaryCards.tsx**: Summary cards showing Total, Average, and Peak consumption
- **EfficiencyRating.tsx**: Displays efficiency rating with color-coded badges
- **EnergyConsumptionChart.tsx**: Enhanced chart with thinner bars, color coding, and better labels
- **AnalysisSection.tsx**: Smart analysis based on real consumption patterns
- **RecommendationsSection.tsx**: Dynamic recommendations based on usage patterns
- **HistoryTable.tsx**: NEW - Calendar-based history table for specific date data viewing

## Key Enhancements

### Real Data Integration
- Replaced all mock data with actual sensor readings
- Real-time consumption calculations from sensor current/voltage values
- Realistic daily, weekly, and monthly patterns based on actual usage

### Chart Improvements
- **Thinner bars**: Reduced bar width from 20px to 12px
- **Less rounded edges**: Reduced border radius from 10px to 2px
- **Color coding**: Bars change color based on consumption levels:
  - Red: High consumption (>130% of average)
  - Orange: Above average (110-130% of average)
  - Green: Normal consumption (90-110% of average)
  - Light Green: Low consumption (70-90% of average)
  - Dark Green: Very low consumption (<70% of average)
- **Better labels**: Fixed label positioning and added horizontal scrolling for better readability
- **Legend**: Added color-coded legend for consumption levels

### New Features
- **History Table**: Users can select any date from the last 30 days to view hourly consumption data
- **Calendar Interface**: Modal calendar for easy date selection
- **Efficiency Badges**: Color-coded efficiency indicators in the history table

### Smart Analytics
- **Dynamic Analysis**: Analysis text changes based on actual consumption patterns and time periods
- **Intelligent Recommendations**: Context-aware recommendations based on usage patterns, variability, and efficiency ratings
- **Real-time Efficiency Rating**: A+ to D ratings based on consumption stability and efficiency

## Usage

Replace the old AnalyticsScreen import with:
```tsx
import AnalyticsScreenRefactored from './screens/analytics/AnalyticsScreenRefactored';
```

## Data Flow
1. AnalyticsDataManager initializes and listens to sensor data
2. Real sensor readings are processed to generate chart data
3. Components receive processed data and render accordingly
4. User interactions (period changes, date selections) trigger data updates
5. All calculations use actual sensor values for accurate analytics
