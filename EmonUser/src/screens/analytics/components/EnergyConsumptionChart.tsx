import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { ChartData, TimePeriod } from '../managers/AnalyticsDataManager';
import { AnalyticsCalculator } from '../utils/AnalyticsCalculator';

interface EnergyConsumptionChartProps {
  chartData: ChartData;
  selectedPeriod: TimePeriod;
  onIntervalChange?: (interval: number) => void;
  isLoading?: boolean;
  subtitle?: string;
  onRefresh?: () => void;
}

const EnergyConsumptionChart: React.FC<EnergyConsumptionChartProps> = ({
  chartData,
  selectedPeriod,
  onIntervalChange,
  isLoading,
  subtitle,
  onRefresh,
}) => {
  const [innerHeight, setInnerHeight] = useState<number>(180);
  const [yStep, setYStep] = useState<number>(0.5);
  const pulse = useRef(new Animated.Value(0.4)).current;
  // Vertical offset to nudge the entire grid block down without changing tick count
  const GRID_Y_OFFSET = 5; // tweak as needed

  useEffect(() => {
    switch (selectedPeriod) {
      case 'Realtime': setYStep(0.2); break;
      case 'Daily': setYStep(0.5); break;
      case 'Weekly': setYStep(3); break;
      case 'Monthly': setYStep(10); break;
    }
  }, [selectedPeriod]);

  const { labels, data, average } = chartData;
  const screenWidth = Dimensions.get('window').width;
  const safeLabels = Array.isArray(labels) ? labels : [];
  const safeData = Array.isArray(data) ? data : [];
  const dataMax = Math.max(...safeData, Number.isFinite(average) ? average : 0);
  const showSkeleton = !!isLoading || safeData.length === 0;

  useEffect(() => {
    if (showSkeleton) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [showSkeleton, pulse]);

  const getNiceStep = (rough: number) => {
    if (!isFinite(rough) || rough <= 0) return 0.1;
    const exp = Math.floor(Math.log10(rough));
    const base = Math.pow(10, exp);
    const m = rough / base;
    let niceMul = 1;
    if (m > 5) niceMul = 10;
    else if (m > 2) niceMul = 5;
    else if (m > 1) niceMul = 2;
    else niceMul = 1;
    return niceMul * base;
  };

  const periodDefaultFloor = (() => {
    switch (selectedPeriod) {
      case 'Realtime': return 0.2;
      case 'Daily': return 0.5;
      case 'Weekly': return 3;
      case 'Monthly': return 10;
      default: return 0.5;
    }
  })();

  useEffect(() => {
    const minTickSpacing = 24;
    const maxTicks = Math.max(2, Math.floor(innerHeight / minTickSpacing));
    if (!isFinite(dataMax) || dataMax <= 0) return;
    const desired = dataMax / maxTicks;
    const auto = Math.max(getNiceStep(desired), periodDefaultFloor);
    const currentTicks = Math.ceil(dataMax / yStep) + 1;
    if (currentTicks > maxTicks && Math.abs(auto - yStep) > 1e-6) {
      setYStep(auto);
    }
  }, [dataMax, innerHeight, selectedPeriod]);

  const yAxisMax = useMemo(() => {
    const raw = Math.max(yStep, dataMax);
    return Math.ceil(raw / yStep) * yStep;
  }, [dataMax, yStep]);

  const chartWidth = Math.max(screenWidth - 40, safeLabels.length * 48);

  const getSkeletonCounts = useMemo(() => {
    if (labels && labels.length) return labels.length;
    switch (selectedPeriod) {
      case 'Realtime': return 6;
      case 'Daily': return 24;
      case 'Weekly': return 7;
      case 'Monthly': return 5;
      default: return 6;
    }
  }, [labels, selectedPeriod]);

  const renderSkeleton = () => {
    const count = getSkeletonCounts;
    const skelWidth = Math.max(screenWidth - 40, count * 40);
    const bars = Array.from({ length: count });
    return (
      <View style={styles.chartContainer}>
        <View style={{ width: 50 }}>
          <Text style={styles.yAxisTitle}>kWh</Text>
          <View style={[styles.yAxisContainer, { height: innerHeight }]}> 
            {(() => {
              const ticks: number[] = [];
              for (let v = 0; v <= yAxisMax + 1e-9; v = parseFloat((v + yStep).toFixed(6))) {
                ticks.push(parseFloat(v.toFixed(3)));
                if (v + yStep > yAxisMax) break;
              }
              return ticks.map((value, i) => {
                let top = innerHeight - Math.round((value / yAxisMax) * innerHeight);
                top = Math.min(innerHeight - 1, Math.max(0, top));
                return (
                  <View key={`skt-${i}`} style={[styles.yAxisLabelContainer, { position: 'absolute', top }]}> 
                    <Animated.View style={[styles.skelLabel, { opacity: pulse }]} />
                    <View style={styles.yAxisLine} />
                  </View>
                );
              });
            })()}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScrollView} contentContainerStyle={{ paddingHorizontal: 10 }}>
          <View style={[styles.chartBars, { width: skelWidth, height: innerHeight }]}> 
            <View
              style={[
                styles.gridOverlay,
                { height: innerHeight + GRID_Y_OFFSET, bottom: -GRID_Y_OFFSET }
              ]}
            > 
              {(() => {
                const gridTicks: number[] = [];
                for (let v = 0; v <= yAxisMax + 1e-9; v = parseFloat((v + yStep).toFixed(6))) {
                  gridTicks.push(parseFloat(v.toFixed(3)));
                  if (v + yStep > yAxisMax) break;
                }
                return gridTicks.map((val, idx) => {
                  let top = innerHeight - Math.round((val / yAxisMax) * innerHeight);
                  top = Math.min(innerHeight - 1, Math.max(0, top));
                  return (
                    <View key={`hs-${idx}`} style={[styles.gridHLine, { top }]} />
                  );
                });
              })()}
              {[0,25,50,75,100].map((p) => (
                <View key={`v-${p}`} style={[styles.gridVLine, { left: `${p}%`, height: innerHeight }]} />
              ))}
            </View>
            {bars.map((_, idx) => (
              <View key={idx} style={styles.barContainer}>
                <View style={[styles.barWrapper, { height: innerHeight }]}> 
                  <Animated.View style={[styles.skelBar, { opacity: pulse }]} />
                </View>
                <View style={styles.barLabelContainer}>
                  <Animated.View style={[styles.skelLabelSmall, { opacity: pulse }]} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderYAxis = () => {
    const ticks: number[] = [];
    for (let v = 0; v <= yAxisMax + 1e-9; v = parseFloat((v + yStep).toFixed(6))) {
      ticks.push(parseFloat(v.toFixed(3)));
      if (v + yStep > yAxisMax) break;
    }
    
    return (
      <View style={{ width: 50 }}>
        <Text style={styles.yAxisTitle}>kWh</Text>
        <View style={[styles.yAxisContainer, { height: innerHeight }]}>
          {ticks.map((value, i) => {
            let top = innerHeight - Math.round((value / yAxisMax) * innerHeight);
            // Ensure base gridline sits inside at the bottom
            top = Math.min(innerHeight - 1, Math.max(0, top));
            return (
              <View
                key={`tick-${i}`}
                style={[styles.yAxisLabelContainer, { position: 'absolute', top }]}
              >
                <Text style={[styles.yAxisText, { transform: [{ translateY: 14 }] }]}>
                  {value > 0 ? value.toFixed(1) : '0'}
                </Text>
                <View style={styles.yAxisLine} />
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderChart = () => {
    if (showSkeleton) return renderSkeleton();
    
    return (
      <View style={styles.chartContainer}>
        {renderYAxis()}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.chartScrollView}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          <View
            style={[styles.chartBars, { width: chartWidth, height: innerHeight }]}
            onLayout={(e) => {
              const h = Math.max(0, Math.round(e.nativeEvent.layout.height));
              if (h && h !== innerHeight) setInnerHeight(h);
            }}
          >
            <View
              style={[
                styles.gridOverlay,
                { 
                  height: innerHeight + GRID_Y_OFFSET, 
                  bottom: -GRID_Y_OFFSET }
              ]}
            >
              {(() => {
                const gridTicks: number[] = [];
                for (let v = 0; v <= yAxisMax + 1e-9; v = parseFloat((v + yStep).toFixed(6))) {
                  gridTicks.push(parseFloat(v.toFixed(3)));
                  if (v + yStep > yAxisMax) break;
                }
                return gridTicks.map((val, idx) => {
                  let top = innerHeight - Math.round((val / yAxisMax) * innerHeight);
                  top = Math.min(innerHeight - 1, Math.max(0, top));
                  return (
                    <View 
                      key={`h-${idx}`} 
                      style={[styles.gridHLine, { top }]} 
                    />
                  );
                });
              })()}
              {[0, 25, 50, 75, 100].map((p) => (
                <View
                  key={`v-${p}`}
                  style={[styles.gridVLine, { left: `${p}%`, height: innerHeight }]}
                />
              ))}
            </View>
            {safeData.map((value, index) => {
              const barHeight = Math.max((value / yAxisMax) * innerHeight, 2);
              const barColor = AnalyticsCalculator.getBarColor(value, average);
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={[styles.barWrapper, { height: innerHeight }]}> 
                    {value > 0 && (
                      <Text style={styles.barValue}>{value.toFixed(1)}</Text>
                    )}
                    <View
                      style={[
                        styles.bar,
                        { height: barHeight, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                  <View style={styles.barLabelContainer}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {safeLabels[index]}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {selectedPeriod === 'Realtime' ? 'Real-time Power' : 
             selectedPeriod === 'Daily' ? 'Hourly Energy' :
             selectedPeriod === 'Weekly' ? 'Daily Energy' : 'Monthly Energy'} Consumption
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshIcon}>⟳</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.chartArea}>
        {renderChart()}
      </View>
      
      <View style={styles.legend}>
        {['#F44336', '#FF9800', '#5B934E', '#4CAF50', '#2E7D32'].map((color, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {['High', 'Above Avg', 'Normal', 'Low', 'Very Low'][i]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  refreshButton: { padding: 6 },
  refreshIcon: { fontSize: 18, color: '#5B934E' },
  title: { fontSize: 18, fontWeight: '600', color: '#2F3E2F' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  chartArea: { height: 270, justifyContent: 'flex-end' },
  chartContainer: { flexDirection: 'row', flex: 1 },
  yAxisContainer: {
    width: 50,
    height: 180,
    justifyContent: 'space-between',
    paddingRight: 8,
    position: 'relative',
  },
  yAxisTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 0,
    fontWeight: '500',
  },
  yAxisLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  yAxisText: {
    fontSize: 11,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  yAxisLine: {
    height: 1,
    backgroundColor: '#EAEAEA',
    flex: 1,
    marginLeft: 4,
  },
  chartScrollView: { flex: 1 },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    minWidth: '100%',
    paddingTop: 0,
    paddingBottom: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#EAEAEA',
    position: 'relative',
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
    height: 130,
    minWidth: 40,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 180,
    paddingBottom: 0,
    position: 'relative',
  },
  bar: {
    width: 16,
    backgroundColor: '#5B934E',
    borderRadius: 4,
    marginBottom: 5,
    minHeight: 2,
    zIndex: 2,
  },
  barValue: {
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  barLabelContainer: {
    alignItems: 'center',
    marginTop: 6,
    width: '100%',
    maxWidth: 60,
  },
  barLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  gridVLine: {
    position: 'absolute',
    bottom: 0,
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    marginVertical: 4,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  skelLabel: {
    width: 32,
    height: 10,
    backgroundColor: '#EDEDED',
    borderRadius: 4,
  },
  skelLabelSmall: {
    width: 28,
    height: 8,
    backgroundColor: '#EDEDED',
    borderRadius: 4,
    marginTop: 6,
  },
  skelBar: {
    width: 16,
    height: 60,
    backgroundColor: '#EDEDED',
    borderRadius: 4,
    marginBottom: 5,
  },
});

export default EnergyConsumptionChart;