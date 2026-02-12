import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ScrollView, Linking, Share, Platform, Alert } from 'react-native';
import { Button, FAB, List, Dialog, Portal, TextInput, Text, IconButton, Checkbox, Menu } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { createGroup, getGroups, deleteGroup, updateGroup, getSelectedPlayersForGroup, getAllMasterPlayers, addPlayerToGroup, getExpensesByGroup, recordSettlement, getAllSettlements, getShuffleState } from '../database/db';
import { Group, Player, Expense } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { Colors } from '../constants/colors';
import AdBanner from '../components/AdBanner';

interface GroupsScreenProps {
  navigation: any;
}

const GroupsScreen: React.FC<GroupsScreenProps> = ({ navigation }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsWithShuffle, setGroupsWithShuffle] = useState<Set<number>>(new Set());
  const [groupsWithEndedShuffle, setGroupsWithEndedShuffle] = useState<Set<number>>(new Set());
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDate, setEditGroupDate] = useState('');
  const [groupDate, setGroupDate] = useState(new Date());
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);
  const [masterPlayers, setMasterPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [overallSettlements, setOverallSettlements] = useState<Array<{from: string, to: string, amount: number}>>([]);
  const { currency, setCurrency } = useCurrency();
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadGroups();
      loadMasterPlayers();
    }, [])
  );

  const loadGroups = async () => {
    const fetchedGroups = await getGroups();
    setGroups(fetchedGroups);
    
    // Check which groups have shuffle states
    const activeShuffleStates = new Set<number>();
    const endedShuffleStates = new Set<number>();
    for (const group of fetchedGroups) {
      const shuffleState = await getShuffleState(group.id);
      if (shuffleState) {
        if (shuffleState.isEnded) {
          endedShuffleStates.add(group.id);
        } else {
          activeShuffleStates.add(group.id);
        }
      }
    }
    setGroupsWithShuffle(activeShuffleStates);
    setGroupsWithEndedShuffle(endedShuffleStates);
    
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

  const shareViaWhatsApp = (from: string, to: string, amount: number) => {
    const message = `Hi ${from}! 👋\n\nJust a friendly reminder about our badminton expenses:\n\nYou owe ${to}: ${currency}${amount.toFixed(2)}\n\nPlease settle up when you get a chance. Thanks! 🏸`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Make sure WhatsApp is installed on your device');
    });
  };

  const shareViaSMS = (from: string, to: string, amount: number) => {
    const message = `Hi ${from}! Just a reminder: You owe ${to} ${currency}${amount.toFixed(2)} for badminton expenses. Please settle up when you can. Thanks!`;
    const url = `sms:?body=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open SMS app');
    });
  };

  const shareGeneric = async (from: string, to: string, amount: number) => {
    try {
      const message = `Hi ${from}!\n\nJust a friendly reminder about our badminton expenses:\n\nYou owe ${to}: ${currency}${amount.toFixed(2)}\n\nPlease settle up when you get a chance. Thanks! 🏸`;
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const shareAllSettlements = async () => {
    if (overallSettlements.length === 0) return;
    
    try {
      let message = '💰 Badminton Expenses - Settlements 🏸\n\n';
      overallSettlements.forEach((transaction, index) => {
        message += `${index + 1}. ${transaction.from} → ${transaction.to}: ${currency}${transaction.amount.toFixed(2)}\n`;
      });
      message += '\nPlease settle up at your earliest convenience. Thanks!';
      
      await Share.share({
        message: message,
        title: 'Badminton Expenses Settlement'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCreateGroup = async () => {
    const groupName = groupDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const groupId = await createGroup(groupName);
    
    // Add selected players to the group
    for (const playerId of selectedPlayerIds) {
      await addPlayerToGroup(groupId, playerId);
    }
    
    setGroupDate(new Date());
    setSelectedPlayerIds(new Set());
    setDialogVisible(false);
    loadGroups();
  };

  const handleCreateDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowCreateDatePicker(false);
    }
    if (selectedDate) {
      setGroupDate(selectedDate);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    await deleteGroup(id);
    loadGroups();
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    // Try to parse the group name as a date, fallback to current date
    const parsedDate = new Date(group.name);
    setEditGroupDate(isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString());
    setEditDialogVisible(true);
  };

  const handleUpdateGroup = async () => {
    if (editingGroup) {
      const newName = new Date(editGroupDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      await updateGroup(editingGroup.id, newName, editingGroup.createdAt);
      setEditDialogVisible(false);
      setEditingGroup(null);
      setEditGroupDate('');
      loadGroups();
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setEditGroupDate(selectedDate.toISOString());
      if (Platform.OS === 'ios') {
        // iOS will be dismissed by the Done button
      }
    }
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
    const shuffleState = await getShuffleState(group.id);
    navigation.navigate('Shuffle', { group, players, shuffleState });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>PlaySplit</Text>
            <Text style={styles.subtitle}>Play &amp; Share with friends</Text>
          </View>
          <View style={styles.headerButtons}>
            <IconButton
              icon="account-group"
              iconColor={Colors.white}
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
                  buttonColor={Colors.transparentWhite}
                  textColor={Colors.white}
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
            description={`Created: ${new Date(item.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`}
            onPress={() => navigateToPlayers(item)}
            right={props => {
              const isTodayDate = isToday(item.createdAt);
              return (
              <View style={styles.actionButtons}>
                <IconButton
                  icon={groupsWithEndedShuffle.has(item.id) ? "shuffle-variant" : (groupsWithShuffle.has(item.id) ? "play" : "shuffle-variant")}
                  iconColor={isTodayDate ? Colors.white : Colors.disabled}
                  size={18}
                  onPress={() => isTodayDate && navigateToShuffle(item)}
                  style={[styles.circleIconSmall, isTodayDate && { backgroundColor: Colors.primary }]}
                  disabled={!isTodayDate}
                />
                <IconButton
                  icon="pencil"
                  iconColor={Colors.white}
                  size={16}
                  onPress={() => handleEditGroup(item)}
                  style={[styles.circleIconSmall, { backgroundColor: Colors.primary }]}
                />
                <IconButton
                  icon="delete"
                  iconColor={Colors.white}
                  size={16}
                  onPress={() => handleDeleteGroup(item.id)}
                  style={[styles.circleIconSmall, { backgroundColor: Colors.error }]}
                />
              </View>
              );
            }}
            style={styles.listItem}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No groups yet. Create your first group!</Text>
          </View>
        }
        ListFooterComponent={
          <>
            <View style={styles.adContainer}>
              <AdBanner />
            </View>
            {overallSettlements.length > 0 ? (
              <View style={styles.overallSettlementContainer}>
              <View style={styles.overallSettlementHeader}>
                <Text style={styles.overallSettlementTitle}>Settlements</Text>
                <IconButton
                  icon="export-variant"
                  size={20}
                  iconColor={Colors.white}
                  onPress={shareAllSettlements}
                  style={[styles.shareAllButton, styles.circleIcon, { backgroundColor: Colors.primary }]}
                />
              </View>
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
                    <View style={styles.settlementActions}>
                      <IconButton
                        icon="whatsapp"
                        size={16}
                        iconColor={Colors.white}
                        onPress={() => shareViaWhatsApp(transaction.from, transaction.to, transaction.amount)}
                        style={[styles.shareButton, styles.circleIcon, { backgroundColor: Colors.whatsapp }]}
                      />
                      <IconButton
                        icon="message-text"
                        size={16}
                        iconColor={Colors.white}
                        onPress={() => shareViaSMS(transaction.from, transaction.to, transaction.amount)}
                        style={[styles.shareButton, styles.circleIcon, { backgroundColor: Colors.primary }]}
                      />
                      <IconButton
                        icon="export-variant"
                        size={16}
                        iconColor={Colors.white}
                        onPress={() => shareGeneric(transaction.from, transaction.to, transaction.amount)}
                        style={[styles.shareButton, styles.circleIcon, { backgroundColor: Colors.textSecondary }]}
                      />
                      <Button
                        mode="contained"
                        compact
                        onPress={() => handleSettleUp(transaction.from, transaction.to, transaction.amount)}
                        style={styles.settleButton}
                        buttonColor={Colors.success}
                        theme={{ roundness: 1 }}
                      >
                        Settle Up
                      </Button>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            ) : null}
          </>
        }
      />

      <FAB
        icon="plus"
        onPress={() => {
          setSelectedPlayerIds(new Set());
          setDialogVisible(true);
        }}
        color={Colors.white}
        customSize={56}
        style={[styles.fab, { backgroundColor: Colors.primary }]}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create Group</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <Button
              mode="outlined"
              onPress={() => setShowCreateDatePicker(true)}
              style={styles.dialogInput}
              icon="calendar"
              theme={{ roundness: 1 }}
            >
              {groupDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Button>
            {showCreateDatePicker && (
              <DateTimePicker
                value={groupDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleCreateDateChange}
              />
            )}
            
            <Text style={styles.sectionTitle}>Select Players ({selectedPlayerIds.size})</Text>
            
            <ScrollView style={styles.playersScrollView} nestedScrollEnabled>
              {masterPlayers.length === 0 ? (
                <View style={styles.noPlayersContainer}>
                  <Text style={styles.noPlayersText}>No players available</Text>
                  <Button
                    mode="text"
                    onPress={() => {
                      setDialogVisible(false);
                      navigation.navigate('MasterPlayers');
                    }}
                    textColor={Colors.primary}
                  >
                    Add Players
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
                  <Button
                    mode="text"
                    onPress={() => {
                      setDialogVisible(false);
                      navigation.navigate('MasterPlayers');
                    }}
                    textColor={Colors.primary}
                    style={styles.addPlayerButton}
                  >
                    Add Player
                  </Button>
                </View>
              )}
            </ScrollView>
          </Dialog.Content>
          
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} theme={{ roundness: 1 }}>Cancel</Button>
            <Button onPress={handleCreateGroup} buttonColor={Colors.primary} textColor={Colors.white} theme={{ roundness: 1 }}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Edit Group</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.dialogInput}
              icon="calendar"
              theme={{ roundness: 1 }}
            >
              {new Date(editGroupDate).toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Button>
            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={new Date(editGroupDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
                {Platform.OS === 'ios' && (
                  <Button
                    mode="contained"
                    onPress={() => setShowDatePicker(false)}
                    buttonColor={Colors.primary}
                    style={styles.doneButton}
                    theme={{ roundness: 1 }}
                  >
                    Done
                  </Button>
                )}
              </View>
            )}
            {editingGroup && (
              <Text style={styles.createdDateText}>
                Created: {new Date(editingGroup.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)} theme={{ roundness: 1 }}>Cancel</Button>
            <Button onPress={handleUpdateGroup} buttonColor={Colors.primary} textColor={Colors.white} theme={{ roundness: 1 }}>Update</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  appHeader: {
    backgroundColor: Colors.primary,
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
    color: Colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.white,
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
    backgroundColor: 'transparent',
  },
  masterPlayersHeader: {
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  masterPlayersButton: {
    width: '100%',
  },
  listItem: {
    backgroundColor: Colors.surface,
    marginBottom: 1,
  },
  adContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 0,
    width: '100%',
  },
  overallSettlementContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  overallSettlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallSettlementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
  },
  shareAllButton: {
    margin: 0,
  },
  settlementContainer: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settlementTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textSecondary,
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
  settlementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  shareButton: {
    margin: 0,
  },
  circleIcon: {
    borderRadius: 20,
    width: 34,
    height: 34,
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
    color: Colors.error,
    fontWeight: 'bold',
  },
  settlementArrow: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  settlementTo: {
    color: Colors.success,
    fontWeight: 'bold',
  },
  settlementAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 8,
  },
  settleButton: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  shuffleButton: {
    margin: 0,
  },
  circleIconSmall: {
    borderRadius: 18,
    width: 32,
    height: 32,
    margin: 2,
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
    color: Colors.textPrimary,
  },
  playersScrollView: {
    maxHeight: 250,
    marginTop: 8,
  },
  playerItem: {
    paddingHorizontal: 0,
  },
  addPlayerButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  doneButton: {
    marginTop: 12,
    marginBottom: 8,
  },
  noPlayersContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noPlayersText: {
    marginBottom: 8,
    color: Colors.textSecondary,
  },
  createdDateText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
});

export default GroupsScreen;
