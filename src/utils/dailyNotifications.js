import * as Notifications from 'expo-notifications';

// Pool tin nhắn ngộ nghĩnh, thôi thúc mở app
const MESSAGES = [
  {
    title: '🍜 Bụng đang réo gọi tên bạn!',
    body: 'Tô phở nóng hổi đang chờ... Đặt ngay trước khi hối hận nhé! 😋',
  },
  {
    title: '🍱 Hôm nay ăn gì chưa?',
    body: 'Đừng để não điều khiển bằng cái bụng rỗng. Đặt đồ ăn ngay đi! 🛵',
  },
  {
    title: '☀️ Buổi trưa vàng ngọc!',
    body: 'Cơm tấm sườn nướng thơm lừng... Chỉ cần 1 cú chạm là có ngay! 🤤',
  },
  {
    title: '🌙 Tối rồi, ăn gì chưa bạn ơi?',
    body: 'Đừng nhịn ăn tội nghiệp bản thân. ShipFood giao tận nơi cho bạn! 🚀',
  },
  {
    title: '💭 Đang nghĩ gì vậy?',
    body: 'Chắc chắn 80% là đang nghĩ đến đồ ăn đúng không? Đặt luôn đi! 😆',
  },
  {
    title: '🍗 Tin quan trọng!!!',
    body: 'Gà rán giòn tan đang cần một người yêu thương... Bạn có muốn không? 🐔',
  },
  {
    title: '⚡ Flash sale tinh thần!',
    body: 'Hôm nay ăn ngon = năng suất tăng 200%. Khoa học chứng minh (do tôi tự nghĩ ra) 😄',
  },
  {
    title: '🤔 Câu hỏi triết học hôm nay:',
    body: '"Nếu không đặt đồ ăn, liệu bạn có thực sự tồn tại?" - Đặt ngay để chứng minh! 🧠',
  },
  {
    title: '🍜 Phở ơi phở!',
    body: 'Một tô phở bò đủ làm cuộc đời tươi đẹp hơn 37%. Tin tôi đi! 🌟',
  },
  {
    title: '😴 Đừng ngủ khi đói!',
    body: 'Ngủ khi no mới ngon giấc. Đặt đồ ăn trước rồi ngủ nhé! 🛌',
  },
  {
    title: '🎯 Nhiệm vụ hôm nay:',
    body: 'Ăn gì đó thật ngon! Bạn xứng đáng được chiều chuộng mà 🥰',
  },
  {
    title: '🍔 Breaking News!',
    body: 'Các món ăn ngon đang tập hợp tại ShipFood và chờ bạn lựa chọn! 📰',
  },
  {
    title: '💪 Năng lượng đang cạn kiệt?',
    body: 'Sạc điện thoại thôi chưa đủ, còn phải sạc cả người nữa. Ăn gì đi! ⚡',
  },
  {
    title: '🌤 Chào buổi sáng tươi đẹp!',
    body: 'Buổi sáng không có bữa sáng ngon giống như điện thoại không có sạc 🥐',
  },
  {
    title: '🎉 Hôm nay là ngày đặc biệt!',
    body: 'Ngày nào cũng đặc biệt nếu có đồ ăn ngon. Đặt ngay đi bạn ơi! 🥳',
  },
  {
    title: '🌶️ Cảnh báo: Có thể gây nghiện!',
    body: 'Một khi đã ăn ngon, bạn sẽ không thể dừng lại... Đặt thôi! 🔥',
  },
  {
    title: '🍕 Ý tưởng hay cho hôm nay:',
    body: 'Thay vì lo lắng, hãy ăn ngon và để mọi thứ tự giải quyết! 😌',
  },
  {
    title: '🛵 Shipper đang đợi nhiệm vụ!',
    body: 'Đặt đồ ăn để cho shipper có việc làm nhé, họ cần bạn đó! 🙏',
  },
  {
    title: '🤩 Đề xuất của ngày hôm nay:',
    body: 'Bún bò Huế cay cay = cảm xúc thăng hoa = cuộc sống ý nghĩa hơn! 🌶️',
  },
  {
    title: '😇 Nhắc nhở nhẹ nhàng:',
    body: 'Ăn uống điều độ là tốt. Nhưng hôm nay cứ ăn ngon đã tính sau! 😂',
  },
  {
    title: '🌙 Đêm nay ăn gì?',
    body: 'Đừng để cái bụng quyết định tâm trạng. Đặt đồ ăn ngay nào! 🍱',
  },
  {
    title: '💡 Ý tưởng thiên tài:',
    body: 'Thay vì nấu ăn mệt mỏi, hãy để ShipFood lo! Não bạn sinh ra để làm việc lớn hơn 🧠',
  },
  {
    title: '🥗 Ăn healthy hôm nay nhé!',
    body: 'Salad, cơm gà... hoặc cứ ăn những gì bạn thích đi! Sống vui là trên hết 😄',
  },
  {
    title: '⏰ Giờ này mà chưa ăn à?',
    body: 'Đặt ngay kẻo đói! ShipFood giao nhanh hơn bạn nghĩ đó 🚀',
  },
  {
    title: '🎵 Bụng đang hát bài:',
    body: '"Đói quá đói quá, mau đặt đồ ăn đi..." - Nghe không? 🎶',
  },
  {
    title: '🦸 Hôm nay bạn là siêu nhân!',
    body: 'Mà siêu nhân cũng cần ăn để có sức chiến đấu. Đặt ngay! 💪',
  },
  {
    title: '😍 Tình yêu lớn nhất:',
    body: 'Không phải tình yêu đôi lứa mà là tình yêu với đồ ăn ngon! Đặt thôi 🍜',
  },
  {
    title: '🌈 Cuộc sống màu sắc hơn khi...',
    body: 'Có đồ ăn ngon! Đặt món yêu thích và cảm nhận sự khác biệt nhé 😋',
  },
  {
    title: '🎁 Quà tặng cho bản thân:',
    body: 'Hôm nay tự thưởng cho mình một bữa ngon đi. Bạn xứng đáng mà! 🥰',
  },
  {
    title: '🔔 Thông báo khẩn:',
    body: 'Dạ dày báo cáo: "Đang trống và cần được tiếp viện gấp!" 🆘',
  },
];

const NOTIFICATION_HOUR = 11;
const NOTIFICATION_MINUTE = 30;
const DAYS_TO_SCHEDULE = 30;
const STORAGE_KEY = 'daily_notif_scheduled_until';

export async function scheduleDailyFoodNotifications() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return;
    }

    // Hủy các thông báo cũ đã lập lịch
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();

    for (let i = 0; i < DAYS_TO_SCHEDULE; i++) {
      const triggerDate = new Date(now);
      triggerDate.setDate(now.getDate() + i);
      triggerDate.setHours(NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);

      // Bỏ qua nếu thời gian đã qua hôm nay
      if (triggerDate <= now) continue;

      const msgIndex = (now.getDate() + i) % MESSAGES.length;
      const msg = MESSAGES[msgIndex];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
          sound: true,
          badge: 1,
        },
        trigger: {
          type: 'date',
          date: triggerDate,
        },
      });
    }
  } catch (e) {
    // Lỗi không ảnh hưởng app
  }
}

export async function cancelDailyNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
