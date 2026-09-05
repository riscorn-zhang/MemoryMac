import {
  KnowledgePoint,
  addKnowledgePoint,
  calcMastery,
  deleteKnowledgePoint,
  getAll,
  getDue,
  getTimeOffset,
  reviewKnowledgePoint,
  setTimeOffset,
  today,
} from '@/services/db';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const THRESHOLD = 40;

export default function App() {
  const insets = useSafeAreaInsets();
  const [allItems, setAllItems] = useState<KnowledgePoint[]>([]);
  const [dueItems, setDueItems] = useState<(KnowledgePoint & { mastery: number })[]>([]);
  const [currentDate, setCurrentDate] = useState(today());
  const [offset, setOffset] = useState(getTimeOffset());

  // modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<KnowledgePoint | null>(null);
  const [reviewScore, setReviewScore] = useState('');
  const [offsetModalVisible, setOffsetModalVisible] = useState(false);
  const [offsetInput, setOffsetInput] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'due'>('due');

  const refresh = useCallback(async () => {
    const all = await getAll();
    setAllItems(all);
    const due = await getDue(THRESHOLD);
    setDueItems(due);
    setCurrentDate(today());
    setOffset(getTimeOffset());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ========== 添加 ==========
  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) {
      Alert.alert('错误', '名称不能为空');
      return;
    }
    await addKnowledgePoint(name);
    setAddName('');
    setAddModalVisible(false);
    refresh();
  };

  // ========== 复习 ==========
  const handleReview = async () => {
    if (!reviewTarget) return;
    const score = parseInt(reviewScore, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      Alert.alert('错误', '请输入 0-100 的分数');
      return;
    }
    const { oldS, newS } = await reviewKnowledgePoint(reviewTarget.id, score);
    Alert.alert(
      '复习完成',
      `S: ${oldS.toFixed(2)} → ${newS.toFixed(2)} 天`
    );
    setReviewScore('');
    setReviewModalVisible(false);
    setReviewTarget(null);
    refresh();
  };

  // ========== 删除 ==========
  const handleDelete = (item: KnowledgePoint) => {
    Alert.alert('确认删除', `确定要删除「${item.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteKnowledgePoint(item.id);
          refresh();
        },
      },
    ]);
  };

  // ========== 时间偏移：点击日期弹出输入框 ==========
  const applyOffset = () => {
    const days = parseInt(offsetInput, 10);
    if (isNaN(days)) {
      Alert.alert('错误', '请输入有效数字');
      return;
    }
    setTimeOffset(days);
    setOffset(days);
    setOffsetModalVisible(false);
    refresh();
  };

  // ========== 渲染掌握度条 ==========
  const MasteryBar = ({ mastery }: { mastery: number }) => {
    const color = mastery < 30 ? '#e74c3c' : mastery < 60 ? '#f39c12' : '#2ecc71';
    return (
      <View style={styles.masteryRow}>
        <View style={styles.barContainer}>
          <View style={[styles.barFill, { width: `${mastery}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.masteryText, { color }]}>{mastery.toFixed(1)}%</Text>
      </View>
    );
  };

  // ========== 渲染单个知识点卡片 ==========
  const renderItem = ({ item }: { item: KnowledgePoint & { mastery?: number } }) => {
    const mastery = item.mastery ?? calcMastery(item.s, item.last);
    const reviewedToday = item.last === currentDate;
    return (
      <Pressable
        style={[styles.kpCard, reviewedToday && styles.kpCardReviewed]}
        onLongPress={() => handleDelete(item)}
        onPress={
          reviewedToday
            ? undefined
            : () => {
              setReviewTarget(item);
              setReviewScore('');
              setReviewModalVisible(true);
            }
        }
      >
        <View style={styles.kpHeader}>
          <Text style={[styles.kpName, reviewedToday && styles.kpNameReviewed]}>
            {item.name}{reviewedToday ? ' ✓' : ''}
          </Text>
          <Text style={styles.kpS}>S={item.s.toFixed(1)}天</Text>
        </View>
        <MasteryBar mastery={mastery} />
      </Pressable>
    );
  };

  const displayData = viewMode === 'due' ? dueItems : allItems.map(kp => ({
    ...kp,
    mastery: calcMastery(kp.s, kp.last),
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ===== 顶部状态栏 ===== */}
      <View style={styles.header}>
        <Pressable onPress={() => {
          setOffsetInput(String(offset));
          setOffsetModalVisible(true);
        }}>
          <Text style={styles.dateText}>
            {offset !== 0 ? `🐛 ${currentDate} (偏移${offset > 0 ? '+' : ''}${offset}天)` : `📅 ${currentDate}`}
          </Text>
        </Pressable>
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleBtn, viewMode === 'due' && styles.toggleActive]}
            onPress={() => setViewMode('due')}
          >
            <Text style={[styles.toggleText, viewMode === 'due' && styles.toggleTextActive]}>
              🔔 待复习 {dueItems.length}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === 'all' && styles.toggleActive]}
            onPress={() => setViewMode('all')}
          >
            <Text style={[styles.toggleText, viewMode === 'all' && styles.toggleTextActive]}>
              📊 全部 {allItems.length}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ===== 列表 ===== */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>
              {viewMode === 'due' ? '没有需要复习的！' : '暂无知识点'}
            </Text>
          </View>
        }
      />

      {/* ===== 底部添加按钮 ===== */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          setAddName('');
          setAddModalVisible(true);
        }}
      >
        <Text style={styles.fabText}>+ 添加知识点</Text>
      </Pressable>

      {/* ===== 添加弹窗 ===== */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加知识点</Text>
            <TextInput
              style={styles.input}
              placeholder="知识点名称"
              placeholderTextColor="#666"
              value={addName}
              onChangeText={setAddName}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.confirmBtn]} onPress={handleAdd}>
                <Text style={styles.confirmBtnText}>添加</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== 复习弹窗 ===== */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>复习: {reviewTarget?.name}</Text>
            <Text style={styles.reviewHint}>掌握度打分 (0-100)</Text>
            <TextInput
              style={styles.input}
              placeholder="0-100"
              placeholderTextColor="#666"
              value={reviewScore}
              onChangeText={setReviewScore}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={handleReview}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setReviewModalVisible(false);
                  setReviewTarget(null);
                }}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.confirmBtn]} onPress={handleReview}>
                <Text style={styles.confirmBtnText}>确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== 时间偏移弹窗 ===== */}
      <Modal visible={offsetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设置时间偏移</Text>
            <Text style={styles.reviewHint}>输入偏移天数（正=快进，负=回退，0=正常）</Text>
            <TextInput
              style={styles.input}
              placeholder="偏移天数"
              placeholderTextColor="#666"
              value={offsetInput}
              onChangeText={setOffsetInput}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={applyOffset}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setOffsetModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.confirmBtn]} onPress={applyOffset}>
                <Text style={styles.confirmBtnText}>确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  // header
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#4a6cf7',
  },
  toggleText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  // list
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  kpCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  kpCardReviewed: {
    opacity: 0.5,
  },
  kpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  kpNameReviewed: {
    color: '#666',
  },
  kpS: {
    color: '#888',
    fontSize: 13,
  },
  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#2a2a3e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  masteryText: {
    fontSize: 13,
    fontWeight: '700',
    width: 55,
    textAlign: 'right',
  },
  // empty
  empty: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  // fab
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#4a6cf7',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4a6cf7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  reviewHint: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#2a2a3e',
  },
  cancelBtnText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#4a6cf7',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});