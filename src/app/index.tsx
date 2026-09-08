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
  toggleArchiveKnowledgePoint,
  updateKnowledgePointName,
} from '@/services/db';
import { Archive, Pencil, Trash2, EllipsisVertical, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const THRESHOLD = 40;
const ENABLE_TIME_OFFSET = false;

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

  // edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgePoint | null>(null);
  const [editName, setEditName] = useState('');

  // menu & about
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  // track the currently open swipeable id for single-row behavior
  const openSwipeableIdRef = useRef<number | null>(null);
  const swipeableRefs = useRef<Map<number, Swipeable | null>>(new Map());

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

  // ========== 编辑名称 ==========
  const handleUpdateName = async () => {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) {
      Alert.alert('错误', '名称不能为空');
      return;
    }
    await updateKnowledgePointName(editTarget.id, name);
    setEditModalVisible(false);
    setEditTarget(null);
    refresh();
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
      <View className="flex-row items-center gap-2">
        <View className="flex-1 h-2 bg-surface-light rounded overflow-hidden">
          <View
            className="h-full rounded"
            style={{ width: `${mastery}%`, backgroundColor: color }}
          />
        </View>
        <Text className="text-xs font-bold w-[55px] text-right" style={{ color }}>
          {mastery.toFixed(1)}%
        </Text>
      </View>
    );
  };

  // ========== 渲染单个知识点卡片 ==========
  const handleArchive = (item: KnowledgePoint) => {
    const isArchived = item.archived;
    Alert.alert(isArchived ? '取消归档' : '确认归档', isArchived ? `将「${item.name}」恢复到列表中` : `归档「${item.name}」后将显示为灰色`, [
      { text: '取消', style: 'cancel' },
      {
        text: isArchived ? '恢复' : '归档',
        onPress: async () => {
          await toggleArchiveKnowledgePoint(item.id);
          refresh();
        },
      },
    ]);
  };

  const renderRightActions = (item: KnowledgePoint) => (
    <View className="flex-row items-center mb-2.5 ml-2">
      <Pressable
        className="bg-blue-500 w-[72px] items-center justify-center rounded-l-2xl h-full"
        onPress={() => {
          setEditTarget(item);
          setEditName(item.name);
          setEditModalVisible(true);
        }}
      >
        <Pencil size={20} color="white" />
        <Text className="text-white text-xs mt-1">编辑</Text>
      </Pressable>
      <Pressable
        className={`w-[72px] items-center justify-center h-full ${item.archived ? 'bg-amber-500' : 'bg-gray-400'}`}
        onPress={() => handleArchive(item)}
      >
        <Archive size={20} color="white" />
        <Text className="text-white text-xs mt-1">{item.archived ? '恢复' : '归档'}</Text>
      </Pressable>
      <Pressable
        className="bg-red-500 w-[72px] items-center justify-center rounded-r-2xl h-full"
        onPress={() => handleDelete(item)}
      >
        <Trash2 size={20} color="white" />
        <Text className="text-white text-xs mt-1">删除</Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: KnowledgePoint & { mastery?: number } }) => {
    const mastery = item.mastery ?? calcMastery(item.s, item.last);
    const reviewedToday = item.last === currentDate;
    const archived = item.archived;

    const cardBg = archived
      ? 'bg-archive-bg'
      : reviewedToday
        ? 'bg-review-bg'
        : 'bg-surface';
    const nameColor = archived
      ? 'text-archive-text'
      : reviewedToday
        ? 'text-review-text'
        : 'text-text';

    const card = (
      <Pressable
        className={`${cardBg} rounded-2xl p-4`}
        onPress={
          archived || reviewedToday
            ? undefined
            : () => {
              setReviewTarget(item);
              setReviewScore('');
              setReviewModalVisible(true);
            }
        }
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text className={`text-[17px] font-semibold ${nameColor}`}>
            {item.name}{archived ? ' 📦' : reviewedToday ? ' ✓' : ''}
          </Text>
          <Text className="text-text-secondary text-xs">S={item.s.toFixed(1)}天</Text>
        </View>
        <MasteryBar mastery={mastery} />
      </Pressable>
    );

    if (viewMode === 'due') {
      return <View className="mb-2.5">{card}</View>;
    }
    return (
      <Swipeable
        ref={(ref) => {
          // ponytail: track the latest ref for this row, used by onSwipeableWillOpen
          swipeableRefs.current.set(item.id, ref);
        }}
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        onSwipeableWillOpen={() => {
          const prev = openSwipeableIdRef.current;
          if (prev !== null && prev !== item.id) {
            swipeableRefs.current.get(prev)?.close();
          }
          openSwipeableIdRef.current = item.id;
        }}
      >
        <View className="mb-2.5">{card}</View>
      </Swipeable>
    );
  };

  const displayData = viewMode === 'due' ? dueItems : allItems.map(kp => ({
    ...kp,
    mastery: calcMastery(kp.s, kp.last),
  }));

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {/* ===== 顶部状态栏 ===== */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row justify-between items-center mb-2.5">
          <View className="flex-1" />
          <Pressable onPress={ENABLE_TIME_OFFSET ? () => {
            setOffsetInput(String(offset));
            setOffsetModalVisible(true);
          } : undefined}>
            <Text className="text-text-tertiary text-sm text-center">
              {offset !== 0 ? `🐛 ${currentDate} (偏移${offset > 0 ? '+' : ''}${offset}天)` : `📅 ${currentDate}`}
            </Text>
          </Pressable>
          <View className="flex-1 items-end">
            <Pressable
              className="w-8 h-8 items-center justify-center"
              onPress={() => setMenuVisible(true)}
            >
              <EllipsisVertical size={20} color="#888" />
            </Pressable>
          </View>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            className={`flex-1 py-2.5 rounded-xl items-center ${viewMode === 'due' ? 'bg-primary' : 'bg-surface'}`}
            onPress={() => setViewMode('due')}
          >
            <Text className={`text-sm font-semibold ${viewMode === 'due' ? 'text-white' : 'text-text-secondary'}`}>
              待复习 {dueItems.length}
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 py-2.5 rounded-xl items-center ${viewMode === 'all' ? 'bg-primary' : 'bg-surface'}`}
            onPress={() => setViewMode('all')}
          >
            <Text className={`text-sm font-semibold ${viewMode === 'all' ? 'text-white' : 'text-text-secondary'}`}>
              全部 {allItems.length}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ===== 列表 ===== */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-5xl mb-3">📭</Text>
            <Text className="text-muted text-base">
              {viewMode === 'due' ? '没有需要复习的！' : '暂无知识点'}
            </Text>
          </View>
        }
      />

      {/* ===== 底部添加按钮 ===== */}
      <Pressable
        className="absolute bottom-8 right-8 w-20 h-20 bg-primary rounded-3xl py-4 items-center justify-center shadow-lg"
        onPress={() => {
          setAddName('');
          setAddModalVisible(true);
        }}
      >
        <Plus color="white" />
      </Pressable>

      {/* ===== 添加弹窗 ===== */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center p-6">
          <View className="bg-surface rounded-[20px] p-6 w-full max-w-[360px]">
            <Text className="text-text text-xl font-bold mb-4 text-center">添加知识点</Text>
            <TextInput
              className="bg-bg rounded-xl p-3.5 text-text text-base mb-4 border border-border"
              placeholder="知识点名称"
              placeholderTextColor="#888"
              value={addName}
              onChangeText={setAddName}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-xl items-center bg-surface-light"
                onPress={() => setAddModalVisible(false)}
              >
                <Text className="text-text-tertiary text-base font-semibold">取消</Text>
              </Pressable>
              <Pressable className="flex-1 py-3 rounded-xl items-center bg-primary" onPress={handleAdd}>
                <Text className="text-white text-base font-semibold">添加</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== 复习弹窗 ===== */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center p-6">
          <View className="bg-surface rounded-[20px] p-6 w-full max-w-[360px]">
            <Text className="text-text text-xl font-bold mb-4 text-center">
              复习: {reviewTarget?.name}
            </Text>
            <Text className="text-text-secondary text-sm mb-2 text-center">掌握度打分 (0-100)</Text>
            <TextInput
              className="bg-bg rounded-xl p-3.5 text-text text-base mb-4 border border-border"
              placeholder="0-100"
              placeholderTextColor="#888"
              value={reviewScore}
              onChangeText={setReviewScore}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={handleReview}
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-xl items-center bg-surface-light"
                onPress={() => {
                  setReviewModalVisible(false);
                  setReviewTarget(null);
                }}
              >
                <Text className="text-text-tertiary text-base font-semibold">取消</Text>
              </Pressable>
              <Pressable className="flex-1 py-3 rounded-xl items-center bg-primary" onPress={handleReview}>
                <Text className="text-white text-base font-semibold">确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== 时间偏移弹窗 ===== */}
      <Modal visible={offsetModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center p-6">
          <View className="bg-surface rounded-[20px] p-6 w-full max-w-[360px]">
            <Text className="text-text text-xl font-bold mb-4 text-center">设置时间偏移</Text>
            <Text className="text-sm mb-2 text-center color-yellow-500">调试模式</Text>
            <Text className="text-text-secondary text-sm mb-2 text-center">
              输入偏移天数（正=快进，负=回退，0=正常）
            </Text>
            <TextInput
              className="bg-bg rounded-xl p-3.5 text-text text-base mb-4 border border-border"
              placeholder="偏移天数"
              placeholderTextColor="#888"
              value={offsetInput}
              onChangeText={setOffsetInput}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={applyOffset}
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-xl items-center bg-surface-light"
                onPress={() => setOffsetModalVisible(false)}
              >
                <Text className="text-text-tertiary text-base font-semibold">取消</Text>
              </Pressable>
              <Pressable className="flex-1 py-3 rounded-xl items-center bg-primary" onPress={applyOffset}>
                <Text className="text-white text-base font-semibold">确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== 编辑名称弹窗 ===== */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center p-6">
          <View className="bg-surface rounded-[20px] p-6 w-full max-w-[360px]">
            <Text className="text-text text-xl font-bold mb-4 text-center">编辑名称</Text>
            <TextInput
              className="bg-bg rounded-xl p-3.5 text-text text-base mb-4 border border-border"
              placeholder="知识点名称"
              placeholderTextColor="#888"
              value={editName}
              onChangeText={setEditName}
              autoFocus
              onSubmitEditing={handleUpdateName}
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-xl items-center bg-surface-light"
                onPress={() => setEditModalVisible(false)}
              >
                <Text className="text-text-tertiary text-base font-semibold">取消</Text>
              </Pressable>
              <Pressable className="flex-1 py-3 rounded-xl items-center bg-primary" onPress={handleUpdateName}>
                <Text className="text-white text-base font-semibold">保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== 菜单弹窗 ===== */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/50" onPress={() => setMenuVisible(false)}>
          <View className="absolute top-12 right-4 bg-surface rounded-2xl shadow-lg overflow-hidden w-40">
            <Pressable
              className="flex-row items-center gap-3 px-4 py-3.5"
              onPress={() => {
                setMenuVisible(false);
                setAboutVisible(true);
              }}
            >
              <Text className="text-text text-base">关于</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ===== 关于弹窗 ===== */}
      <Modal visible={aboutVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center p-6">
          <View className="bg-surface rounded-[20px] p-6 w-full max-w-[360px]">
            <Text className="text-text text-xl font-bold mb-4 text-center">关于 MemoryMac</Text>
            <Text className="text-text-secondary text-sm text-center mb-1">间隔记忆复习助手</Text>
            <Text className="text-text-tertiary text-xs text-center mb-4">v1.0.0</Text>
            <Text className="text-text-secondary text-sm text-center mb-4 leading-5">
              基于遗忘曲线的间隔复习系统，帮助你高效记忆知识点。
            </Text>
            <Pressable
              className="py-3 rounded-xl items-center bg-primary"
              onPress={() => setAboutVisible(false)}
            >
              <Text className="text-white text-base font-semibold">关闭</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}