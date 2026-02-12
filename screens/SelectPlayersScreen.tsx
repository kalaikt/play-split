import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ScrollView } from 'react-native';
import { Button, List, Text, Checkbox, IconButton, Dialog, Portal, TextInput, Menu } from 'react-native-paper';
import { getAllMasterPlayers, addPlayerToGroup, removePlayerFromGroup, getSelectedPlayersForGroup, createExpense, getExpensesByGroup, updateExpense, deleteExpense } from '../database/db';
import { Player, Group, GradeLevel, Expense } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { Colors, GradeLevelColors } from '../constants/colors';

interface SelectPlayersScreenProps {
  route: any;
  navigation: any;
}

const SelectPlayersScreen: React.FC<SelectPlayersScreenProps> = ({ route, navigation }) => {
  const { group }: { group: Group } = route.params;
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDialogVisible, setExpenseDialogVisible] = useState(false);
  const [expenseListVisible, setExpenseListVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [payerMenuVisible, setPayerMenuVisible] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [paidByError, setPaidByError] = useState(false);
  const { currency } = useCurrency();

  useEffect(() => {
    loadPlayers();
    loadExpenses();
  }, []);

  const loadPlayers = async () => {
    const masterPlayers = await getAllMasterPlayers();
    const selectedPlayers = await getSelectedPlayersForGroup(group.id);
    
    setAllPlayers(masterPlayers);
    setSelectedPlayerIds(new Set(selectedPlayers.map(p => p.id)));
  };

  const loadExpenses = async () => {
    const groupExpenses = await getExpensesByGroup(group.id);
    setExpenses(groupExpenses);
  };

  const openAddExpenseDialog = () => {
    setEditingExpense(null);
    setExpenseAmount('');
    setExpenseTitle('');
    setPaidBy('');
    setTitleError(false);
    setAmountError(false);
    setPaidByError(false);
    setExpenseListVisible(false);
    setExpenseDialogVisible(true);
  };

  const openEditExpenseDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseAmount(expense.amount.toString());
    setExpenseTitle(expense.title);
    setPaidBy(expense.paidBy);
    setTitleError(false);
    setAmountError(false);
    setPaidByError(false);
    setExpenseDialogVisible(true);
  };

  const handleSaveExpense = async () => {
    // Reset errors
    setTitleError(false);
    setAmountError(false);
    setPaidByError(false);
    
    // Validate fields
    let hasError = false;
    
    if (!expenseTitle || !expenseTitle.trim()) {
      setTitleError(true);
      hasError = true;
    }
    
    if (!expenseAmount || isNaN(parseFloat(expenseAmount))) {
      setAmountError(true);
      hasError = true;
    }
    
    if (!paidBy || !paidBy.trim()) {
      setPaidByError(true);
      hasError = true;
    }
    
    if (hasError) {
      return;
    }
    
    try {
      const amount = parseFloat(expenseAmount);
      
      if (editingExpense) {
        await updateExpense(editingExpense.id, amount, paidBy, expenseTitle);
      } else {
        await createExpense(group.id, amount, paidBy, expenseTitle);
      }
      
      setExpenseDialogVisible(false);
      setExpenseListVisible(false);
      setExpenseAmount('');
      setExpenseTitle('');
      setPaidBy('');
      setEditingExpense(null);
      
      await loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    await deleteExpense(id);
    loadExpenses();
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getSplitAmount = () => {
    const total = getTotalExpenses();
    const playerCount = selectedPlayerIds.size;
    return playerCount > 0 ? total / playerCount : 0;
  };

  const togglePlayer = async (playerId: number) => {
    const newSelected = new Set(selectedPlayerIds);
    
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
      await removePlayerFromGroup(group.id, playerId);
    } else {
      newSelected.add(playerId);
      await addPlayerToGroup(group.id, playerId);
    }
    
    setSelectedPlayerIds(newSelected);
    // Reload to update expense info if needed
    await loadExpenses();
  };

  const getGradeLevelColor = (level: GradeLevel) => {
    return GradeLevelColors[level] || Colors.textDisabled;
  };

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <IconButton
              icon="arrow-left"
              iconColor={Colors.white}
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <View>
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.subtitle}>
                {selectedPlayerIds.size} player{selectedPlayerIds.size !== 1 ? 's' : ''} selected
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {expenses.length > 0 && (
          <View style={styles.expenseInfoBar}>
            <Text style={styles.expenseInfo}>
              Total: {currency}{getTotalExpenses().toFixed(2)}
            </Text>
          </View>
        )}
        {/* Players Section */}
        {allPlayers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text>No players available.</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('MasterPlayers')}
              style={styles.addButton}
              buttonColor={Colors.primary}
              theme={{ roundness: 1 }}
            >
              Add Players
            </Button>
          </View>
        ) : (
          allPlayers.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              description={item.gradeLevel}
              left={props => (
                <View style={styles.leftContent}>
                  <View
                    style={[
                      styles.gradeBadge,
                      { backgroundColor: getGradeLevelColor(item.gradeLevel) }
                    ]}
                  />
                </View>
              )}
              right={props => (
                <Checkbox
                  status={selectedPlayerIds.has(item.id) ? 'checked' : 'unchecked'}
                  onPress={() => togglePlayer(item.id)}
                />
              )}
              onPress={() => togglePlayer(item.id)}
              style={styles.listItem}
            />
          ))
        )}

        {/* Expenses Section */}
        {expenses.length > 0 && (
          <View style={styles.expensesSection}>
            <View style={styles.expensesSectionHeader}>
              <Text style={styles.expensesSectionTitle}>Expenses</Text>
              <Button
                mode="contained"
                onPress={openAddExpenseDialog}
                compact
                buttonColor={Colors.primary}
                theme={{ roundness: 1 }}
              >
                Add
              </Button>
            </View>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseDetailsColumn}>
                  <Text style={styles.expenseTitle}>{expense.title}</Text>
                  <View style={styles.expenseRow}>
                    <Text style={styles.expenseLabel}>Amount: </Text>
                    <Text style={styles.expenseAmount}>{currency}{expense.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.expenseRow}>
                    <Text style={styles.expenseLabel}>Paid by: </Text>
                    <Text style={styles.expensePaidBy}>{expense.paidBy}</Text>
                  </View>
                </View>
                <View style={styles.expenseActions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => openEditExpenseDialog(expense)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={Colors.error}
                    onPress={() => handleDeleteExpense(expense.id)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {expenses.length === 0 && allPlayers.length > 0 && (
          <View style={styles.noExpensesContainer}>
            <Text style={styles.noExpensesText}>No expenses yet</Text>
            <Button
              mode="contained"
              onPress={openAddExpenseDialog}
              style={styles.addButton}
              buttonColor={Colors.primary}
              theme={{ roundness: 1 }}
            >
              Add Expense
            </Button>
          </View>
        )}

      </ScrollView>

      <Portal>
        <Dialog visible={expenseListVisible} onDismiss={() => setExpenseListVisible(false)} style={styles.expenseDialog}>
          <Dialog.Title>Expenses</Dialog.Title>
          <Dialog.Content>
            {expenses.length === 0 ? (
              <Text style={styles.noExpenses}>No expenses yet</Text>
            ) : (
              <ScrollView style={styles.expenseList}>
                {expenses.map((expense) => (
                  <View key={expense.id} style={styles.expenseItem}>
                    <View style={styles.expenseDetailsColumn}>
                      <Text style={styles.expenseTitle}>{expense.title}</Text>
                      <View style={styles.expenseRow}>
                        <Text style={styles.expenseLabel}>Amount: </Text>
                        <Text style={styles.expenseAmount}>{currency}{expense.amount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.expenseRow}>
                        <Text style={styles.expenseLabel}>Paid by: </Text>
                        <Text style={styles.expensePaidBy}>{expense.paidBy}</Text>
                      </View>
                    </View>
                    <View style={styles.expenseActions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => {
                          setExpenseListVisible(false);
                          openEditExpenseDialog(expense);
                        }}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={Colors.error}
                        onPress={() => handleDeleteExpense(expense.id)}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={openAddExpenseDialog} buttonColor={Colors.primary} textColor={Colors.white} theme={{ roundness: 1 }}>Add Expense</Button>
            <Button onPress={() => setExpenseListVisible(false)} theme={{ roundness: 1 }}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={expenseDialogVisible} onDismiss={() => setExpenseDialogVisible(false)}>
          <Dialog.Title>{editingExpense ? 'Edit Expense' : 'Add Expense'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Expense Title"
              value={expenseTitle}
              onChangeText={(text) => {
                setExpenseTitle(text);
                setTitleError(false);
              }}
              mode="outlined"
              style={styles.input}
              error={titleError}
            />
            {titleError && <Text style={styles.errorText}>Title is required</Text>}
            <TextInput
              label="Amount"
              value={expenseAmount}
              onChangeText={(text) => {
                setExpenseAmount(text);
                setAmountError(false);
              }}
              keyboardType="decimal-pad"
              mode="outlined"
              left={<TextInput.Affix text={currency} />}
              style={styles.input}
              error={amountError}
            />
            {amountError && <Text style={styles.errorText}>Valid amount is required</Text>}
            <Text style={styles.label}>Paid By</Text>
            <Menu
              visible={payerMenuVisible}
              onDismiss={() => setPayerMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setPayerMenuVisible(true)}
                  style={[styles.input, paidByError && styles.errorButton]}
                  theme={{ roundness: 1 }}
                  textColor={paidByError ? Colors.error : undefined}
                >
                  {paidBy || 'Select Player'}
                </Button>
              }
            >
              {allPlayers
                .filter(p => selectedPlayerIds.has(p.id))
                .map(player => (
                  <Menu.Item
                    key={player.id}
                    onPress={() => {
                      setPaidBy(player.name);
                      setPaidByError(false);
                      setPayerMenuVisible(false);
                    }}
                    title={player.name}
                  />
                ))
              }
            </Menu>
            {paidByError && <Text style={styles.errorText}>Please select who paid</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExpenseDialogVisible(false)} theme={{ roundness: 1 }}>Cancel</Button>
            <Button onPress={handleSaveExpense} buttonColor={Colors.primary} textColor={Colors.white} theme={{ roundness: 1 }}>Save</Button>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    margin: 0,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.white,
    marginTop: 2,
    opacity: 0.9,
  },
  expenseInfoBar: {
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
  },
  expenseInfo: {
    fontSize: 13,
    color: Colors.primaryDark,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  listItem: {
    backgroundColor: Colors.surface,
    marginBottom: 1,
  },
  leftContent: {
    justifyContent: 'center',
  },
  gradeBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  addButton: {
    marginTop: 16,
  },
  expensesSection: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  expensesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expensesSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  noExpensesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noExpensesText: {
    color: Colors.textDisabled,
    marginBottom: 12,
  },
  expenseDialog: {
    maxHeight: '70%',
  },
  expenseList: {
    maxHeight: 300,
  },
  noExpenses: {
    textAlign: 'center',
    color: Colors.textDisabled,
    padding: 20,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expenseDetailsColumn: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  expenseLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  expensePaidBy: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  expenseDescription: {
    fontSize: 12,
    color: Colors.textDisabled,
    marginTop: 2,
  },
  expenseActions: {
    flexDirection: 'row',
  },
  input: {
    marginTop: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  errorButton: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
});

export default SelectPlayersScreen;
