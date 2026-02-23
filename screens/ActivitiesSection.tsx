import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSettlements } from '../database/db';
import { Colors } from '../constants/colors';
import { useCurrency } from '../context/CurrencyContext';

interface ActivitiesSectionProps {
  refreshTrigger?: number;
}

const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({ refreshTrigger = 0 }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const { currency } = useCurrency();

  const loadActivities = useCallback(async () => {
    const data = await getAllSettlements();
    const sorted = (data || []).sort(
      (a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
    );
    setActivities(sorted);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  useEffect(() => {
    loadActivities();
  }, [refreshTrigger, loadActivities]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activities</Text>
      {activities.length === 0 ? (
        <Text style={styles.emptyText}>No activities yet. Settle up from the list above to see history here.</Text>
      ) : (
      activities.map((activity, idx) => (
        <View key={activity.id || idx} style={styles.row}>
          <Text style={styles.text}>
            <Text style={styles.from}>{activity.fromPlayer}</Text>
            <Text style={styles.arrow}> → </Text>
            <Text style={styles.to}>{activity.toPlayer}</Text>
            <Text style={styles.amount}> settled {currency}{activity.amount}</Text>
          </Text>
          <Text style={styles.date}>{new Date(activity.settledAt).toLocaleString()}</Text>
        </View>
      ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  row: {
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
  },
  from: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  arrow: {
    color: Colors.textSecondary,
  },
  to: {
    color: Colors.success,
    fontWeight: 'bold',
  },
  amount: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default ActivitiesSection;
