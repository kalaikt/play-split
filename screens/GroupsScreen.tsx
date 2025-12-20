import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ScrollView } from 'react-native';
import { Button, FAB, List, Dialog, Portal, TextInput, Text, IconButton, Checkbox, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { createGroup, getGroups, deleteGroup, getSelectedPlayersForGroup, getAllMasterPlayers, addPlayerToGroup, getExpensesByGroup, recordSettlement, getAllSettlements } from '../database/db';
import { Group, Player, Expense } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface GroupsScreenProps {
  navigation: any;
}

const GroupsScreen: React.FC<GroupsScreenProps> = ({ navigation }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [groupName, setGroupName] = useState('Monday');
  const [dayMenuVisible, setDayMenuVisible] = useState(false);
  const [masterPlayers, setMasterPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [overallSettlements, setOverallSettlements] = useState<Array<{from: string, to: string, amount: number}>>([]);
  const { currency, setCurrency } = useCurrency();
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);

  useEffect(() => {
    loadMasterPlayers();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadGroups();
    }, [])
  );

  const loadGroups = async () => {
    const fetchedGroups = await getGroups();
    setGroups(fetchedGroups);
    
    // Get all settled transactions
    const settledTransactions = await getAllSettlements();
    const settledMap: Record<string, number> = {};
    
    settledTransactions.forEach((settlement: any) => {
      const key = `${settlement.fromPlayer}->${settlement.toPlayer}`;
      if (!settledMap[key]) {
        settledMap[key] = 0;
      }
      settledMap[key] += settlement.amount;
    });
    
    // Calculate overall settlements across all groups
    const overallBalances: Record<string, number> = {};
    
    for (const group of fetchedGroups) {
      const expenses = await getExpensesByGroup(group.id);
      const players = await getSelectedPlayersForGroup(group.id);
      
      if (expenses.length > 0 && players.length > 0) {
        const totalExpense = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
        const splitAmount = totalExpense / players.length;
        
        // Calculate how much each player paid
        const paymentsByPlayer: Record<string, number> = {};
        players.forEach(player => {
          paymentsByPlayer[player.name] = 0;
        });
        
        expenses.forEach((expense: any) => {
          if (paymentsByPlayer.hasOwnProperty(expense.paidBy)) {
            paymentsByPlayer[expense.paidBy] += expense.amount;
          }
        });
        
        // Add to overall balance
        players.forEach(player => {
          const balance = paymentsByPlayer[player.name] - splitAmount;
          if (!overallBalances[player.name]) {
            overallBalances[player.name] = 0;
          }
          overallBalances[player.name] += balance;
        });
      }
    }
    
    // Convert balances to array and separate creditors and debtors
    const balances = Object.entries(overallBalances)
      .map(([name, balance]) => ({ name, balance }))
      .filter(b => Math.abs(b.balance) > 0.01);
    
    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
    
    // Match debtors with creditors to minimize transactions
    const transactions: Array<{from: string, to: string, amount: number}> = [];
    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
      const debtor = { ...debtors[i] };
      const creditor = { ...creditors[j] };
      const debtAmount = Math.abs(debtor.balance);
      const creditAmount = creditor.balance;
      
      const settleAmount = Math.min(debtAmount, creditAmount);
      
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: settleAmount
      });
      
      debtors[i].balance += settleAmount;
      creditors[j].balance -= settleAmount;
      
      if (Math.abs(debtors[i].balance) < 0.01) i++;
      if (creditors[j].balance < 0.01) j++;
    }
    
    // Filter out already settled transactions
    const unsettledTransactions = transactions.filter(txn => {
      const key = `${txn.from}->${txn.to}`;
      const settledAmount = settledMap[key] || 0;
      
      if (settledAmount >= txn.amount) {
        return false; // Fully settled
      } else if (settledAmount > 0) {
        // Partially settled, reduce the amount
        txn.amount -= settledAmount;
        return true;
      }
      return true;
    });
    
    setOverallSettlements(unsettledTransactions);
  };

  const loadMasterPlayers = async () => {
    const players = await getAllMasterPlayers();
    setMasterPlayers(players);
  };

  const handleSettleUp = async (from: string, to: string, amount: number) => {
    await recordSettlement(from, to, amount);
    await loadGroups(); // Reload to recalculate settlements
  };

  const handleCreateGroup = async () => {
    if (groupName.trim()) {
      const groupId = await createGroup(groupName.trim());
      
      // Add selected players to the group
      for (const playerId of selectedPlayerIds) {
        await addPlayerToGroup(groupId, playerId);
      }
      
      setGroupName('Monday');
      setSelectedPlayerIds(new Set());
      setDialogVisible(false);
      loadGroups();
    }
  };

  const handleDeleteGroup = async (id: number) => {
    await deleteGroup(id);
    loadGroups();
  };

  const togglePlayer = (playerId: number) => {
    const newSelected = new Set(selectedPlayerIds);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayerIds(newSelected);
  };

  const navigateToPlayers = (group: Group) => {
    navigation.navigate('SelectPlayers', { group });
  };

  const navigateToShuffle = async (group: Group) => {
    const players = await getSelectedPlayersForGroup(group.id);
    navigation.navigate('Shuffle', { group, players });
  };

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>PlaySplit</Text>
            <Text style={styles.subtitle}>Split expenses with friends</Text>
          </View>
          <View style={styles.headerButtons}>
            <IconButton
              icon="account-group"
              iconColor="#fff"
              size={24}
              onPress={() => navigation.navigate('MasterPlayers')}
              style={styles.playersButton}
            />
            <Menu
              visible={currencyMenuVisible}
              onDismiss={() => setCurrencyMenuVisible(false)}
              anchor={
                <Button
                  mode="contained"
                  onPress={() => setCurrencyMenuVisible(true)}
                  style={styles.currencyButton}
                  buttonColor="rgba(255, 255, 255, 0.2)"
                  textColor="#fff"
                  compact
                >
                  {currency}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setCurrency('$'); setCurrencyMenuVisible(false); }} title="$ USD" />
              <Menu.Item onPress={() => { setCurrency('€'); setCurrencyMenuVisible(false); }} title="€ EUR" />
              <Menu.Item onPress={() => { setCurrency('£'); setCurrencyMenuVisible(false); }} title="£ GBP" />
              <Menu.Item onPress={() => { setCurrency('¥'); setCurrencyMenuVisible(false); }} title="¥ JPY" />
              <Menu.Item onPress={() => { setCurrency('₹'); setCurrencyMenuVisible(false); }} title="₹ INR" />
              <Menu.Item onPress={() => { setCurrency('₱'); setCurrencyMenuVisible(false); }} title="₱ PHP" />
            </Menu>
          </View>
        </View>
      </View>
      
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={new Date(item.createdAt).toLocaleDateString()}
            onPress={() => navigateToPlayers(item)}
            right={props => (
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={() => navigateToShuffle(item)}
                  compact
                  style={styles.shuffleButton}
                  buttonColor="#1976d2"
                  theme={{ roundness: 1 }}
                >
                  Shuffle
                </Button>
                <IconButton
                  icon="delete"
                  iconColor="red"
                  size={20}
                  onPress={() => handleDeleteGroup(item.id)}
                />
              </View>
            )}
            style={styles.listItem}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No groups yet. Create your first group!</Text>
          </View>
        }
        ListFooterComponent={
          overallSettlements.length > 0 ? (
            <View style={styles.overallSettlementContainer}>
              <Text style={styles.overallSettlementTitle}>Overall Settlement (All Groups)</Text>
              {overallSettlements.map((transaction, index) => (
                <View key={index} style={styles.settlementRow}>
                  <View style={styles.settlementItemWithButton}>
                    <View style={styles.settlementTextContainer}>
                      <Text style={styles.settlementText}>
                        <Text style={styles.settlementFrom}>{transaction.from}</Text>
                        <Text style={styles.settlementArrow}> → </Text>
                        <Text style={styles.settlementTo}>{transaction.to}</Text>
                      </Text>
                      <Text style={styles.settlementAmount}>
                        {currency}{transaction.amount.toFixed(2)}
                      </Text>
                    </View>
                    <Button
                      mode="contained"
                      compact
                      onPress={() => handleSettleUp(transaction.from, transaction.to, transaction.amount)}
                      style={styles.settleButton}
                      buttonColor="#4caf50"
                      theme={{ roundness: 1 }}
                    >
                      Settle Up
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          setSelectedPlayerIds(new Set());
          setDialogVisible(true);
        }}
        color="#fff"
        customSize={56}
        backgroundColor="#1976d2"
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create New Group</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.sectionTitle}>Select Day</Text>
            <Menu
              visible={dayMenuVisible}
              onDismiss={() => setDayMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setDayMenuVisible(true)}
                  style={styles.dialogInput}
                  theme={{ roundness: 1 }}
                >
                  {groupName}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setGroupName('Monday'); setDayMenuVisible(false); }} title="Monday" />
              <Menu.Item onPress={() => { setGroupName('Tuesday'); setDayMenuVisible(false); }} title="Tuesday" />
              <Menu.Item onPress={() => { setGroupName('Wednesday'); setDayMenuVisible(false); }} title="Wednesday" />
              <Menu.Item onPress={() => { setGroupName('Thursday'); setDayMenuVisible(false); }} title="Thursday" />
              <Menu.Item onPress={() => { setGroupName('Friday'); setDayMenuVisible(false); }} title="Friday" />
              <Menu.Item onPress={() => { setGroupName('Saturday'); setDayMenuVisible(false); }} title="Saturday" />
              <Menu.Item onPress={() => { setGroupName('Sunday'); setDayMenuVisible(false); }} title="Sunday" />
            </Menu>
            
            <Text style={styles.sectionTitle}>Select Players ({selectedPlayerIds.size})</Text>
            
            <ScrollView style={styles.playersScrollView} nestedScrollEnabled>
              {masterPlayers.length === 0 ? (
                <View style={styles.noPlayersContainer}>
                  <Text style={styles.noPlayersText}>No master players available</Text>
                  <Button
                    mode="text"
                    onPress={() => {
                      setDialogVisible(false);
                      navigation.navigate('MasterPlayers');
                    }}
                    textColor="#1976d2"
                  >
                    Add Master Players
                  </Button>
                </View>
              ) : (
                <View>
                  {masterPlayers.map((player) => (
                    <List.Item
                      key={player.id}
                      title={player.name}
                      description={player.gradeLevel}
                      onPress={() => togglePlayer(player.id)}
                      right={props => (
                        <Checkbox
                          status={selectedPlayerIds.has(player.id) ? 'checked' : 'unchecked'}
                          onPress={() => togglePlayer(player.id)}
                        />
                      )}
                      style={styles.playerItem}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </Dialog.Content>
          
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} theme={{ roundness: 1 }}>Cancel</Button>
            <Button onPress={handleCreateGroup} buttonColor="#1976d2" textColor="#fff" theme={{ roundness: 1 }}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  appHeader: {
    backgroundColor: '#1976d2',
    padding: 16,
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  currencyButton: {
    minWidth: 60,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playersButton: {
    margin: 0,
  },
  masterPlayersHeader: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  masterPlayersButton: {
    width: '100%',
  },
  listItem: {
    backgroundColor: '#fff',
    marginBottom: 1,
  },
  overallSettlementContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#1976d2',
  },
  overallSettlementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  settlementContainer: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settlementTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  settlementRow: {
    marginBottom: 6,
  },
  settlementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementItemWithButton: {
    flexDirection: 'column',
    gap: 8,
  },
  settlementTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementText: {
    fontSize: 13,
    flex: 1,
  },
  settlementFrom: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  settlementArrow: {
    color: '#666',
    fontSize: 16,
  },
  settlementTo: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  settlementAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginLeft: 8,
  },
  settleButton: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shuffleButton: {
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  dialogInput: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
    color: '#333',
  },
  playersScrollView: {
    maxHeight: 250,
    marginTop: 8,
  },
  playerItem: {
    paddingHorizontal: 0,
  },
  noPlayersContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noPlayersText: {
    marginBottom: 8,
    color: '#666',
  },
});

export default GroupsScreen;
