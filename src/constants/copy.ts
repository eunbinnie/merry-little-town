// All user-facing copy (Korean) lives here.
import type { GiftId, HouseId } from "@/features/village/game";
import type { BuildingId } from "@/game/world";

export const COPY = {
  meta: {
    title: "크리스마스가 도착하는 마을",
    description:
      "산타가 되어 눈 내리는 마을을 걸어요. 선물을 하나씩 전할 때마다 마을에 불이 켜져요.",
  },
  loading: "마을로 날아가는 중…",
  landing: {
    titleLines: ["크리스마스가 도착하는", "마을"],
    description: "오늘 밤, 당신이 산타예요.",
    cta: "썰매 타고 출발하기",
  },
  intro: { skip: "건너뛰기" },
  hud: {
    progress: (n: number, total: number) => `선물 ${n}/${total}`,
    progressLabel: (n: number, total: number) => `${total}집 중 ${n}집에 선물을 전했어요`,
    sack: "선물 자루",
    sackEmpty: "선물 자루가 비어 있어요",
    sackLabel: (names: string[]) => `선물 자루: ${names.join(", ")}`,
    photo: "사진",
    menu: "처음부터",
    goTo: "바로 가기",
    sleigh: "루돌프의 썰매",
    goToLabel: (name: string) => `${name}(으)로 걷기`,
  },
  hint: {
    move: "화면을 눌러 산타를 움직여요",
    moveKeys: "방향키·WASD로 걷고 Space로 말을 걸어요",
    load: "썰매 짐칸을 눌러 선물을 챙겨요",
    deliver: "불 꺼진 집을 찾아 문 앞에 선물을 놓아요",
    reload: "자루가 비었어요. 썰매에서 선물을 더 챙겨요",
    explore: "트리 앞에서 사진을 남겨보세요",
    busy: "",
  },
  toast: {
    loaded: "선물을 챙겼어요",
    sackFull: "자루가 가득 찼어요",
    sackFullBody: "먼저 선물을 전하고 와요.",
    allLoaded: "남은 선물은 모두 자루에 있어요",
    noGift: "선물 자루가 비었어요",
    noGiftBody: "썰매에서 선물을 챙겨 와요.",
    chimney: "문이 눈에 꽁꽁 막혔어요",
    chimneyBody: "루돌프! 굴뚝으로 가자!",
    complete: "마을에 크리스마스가 도착했어요",
    completeBody: "마을을 더 걸어보고, 마음에 드는 곳에서 사진을 찍어보세요.",
    unreachable: "그곳으로는 갈 수 없어요",
    tree: "광장의 큰 트리",
    treeWaiting: "모든 집에 선물을 전하면 불이 켜질 거예요.",
    treeLit: "반짝반짝. 여기서 사진을 남겨보세요.",
  },
  near: {
    sleigh: "Space · 선물 챙기기",
    deliver: "Space · 선물 놓기",
    look: "Space · 살펴보기",
  },
  photo: {
    title: "크리스마스 사진",
    close: "닫기",
    failed: "사진을 만들지 못했어요. 잠시 후 다시 시도해주세요.",
    shareTitle: "크리스마스가 도착하는 마을",
  },
  card: {
    deliveredTitle: "작은 선물을 두고 왔어요.",
    deliveredBody: "이 선물은 누구에게 보내고 싶나요?",
    revisitTitle: (house: string) => `${house}에 두고 온 선물`,
    revisitBody: "이 선물에 마음을 담아볼까요?",
    greeting: "Merry Christmas",
    to: "To.",
    from: "From.",
    toPlaceholder: "소중한 사람의 이름",
    messagePlaceholder: "따뜻한 마음을 전해보세요.",
    fromPlaceholder: "보내는 사람",
    toLabel: "받는 사람",
    messageLabel: "크리스마스 메시지",
    fromLabel: "보내는 사람, 비워두면 익명",
    giftLabel: (gift: string) => `함께 둔 선물: ${gift}`,
    done: "카드 완성하기",
    later: "나중에 쓸게요",
    leaving: "산타가 조용히 떠나는 중…",
    previewTitle: "당신이 누군가의 산타가 되었어요.",
    previewBody: "소중한 사람에게 작은 크리스마스를 선물해보세요.",
    share: "선물 공유하기",
    save: "이미지 저장하기",
    edit: "편지 수정하기",
    back: "마을로 돌아가기",
    copyLink: "마을 주소 복사",
    failed: "카드를 그리지 못했어요. 다시 시도해주세요.",
    alt: (to: string) => `${to}에게 보내는 크리스마스 카드`,
  },
  share: {
    text: (url: string) => `작은 크리스마스가 도착했어요. 당신도 마을의 산타가 되어보세요.\n${url}`,
    shared: "공유를 마쳤어요.",
    saved: "이미지를 저장했어요. 메신저에서 보내주세요.",
    unsupported: "이 브라우저는 바로 공유할 수 없어요. 이미지를 저장해 메신저로 보내주세요.",
    failed: "공유하지 못했어요. 이미지를 저장해 보내주세요.",
    linkCopied: "마을 주소를 복사했어요.",
    holdToSave: "이미지를 길게 눌러 사진에 저장할 수도 있어요.",
  },
  sound: {
    state: (on: boolean) => (on ? "소리 켜짐" : "소리 꺼짐"),
    settings: "소리 설정",
    music: "음악",
    sfx: "효과음",
    ambient: "바람 소리",
  },
  restart: {
    title: "처음부터 다시 배달할까요?",
    body: "지금까지 전한 선물과 밝혀진 불빛이 모두 사라져요.",
    confirm: "처음부터 하기",
    cancel: "계속 배달하기",
  },
  postcard: {
    greeting: "Merry Christmas",
    message: "당신에게도 따뜻한 크리스마스가 찾아오길.",
    brand: "크리스마스가 도착하는 마을",
  },
} as const;

export const BUILDING_NAMES: Record<BuildingId, string> = {
  workshop: "산타의 선물 창고",
  chapel: "언덕 위 작은 예배당",
  bakery: "마을 빵집",
  "tea-house": "모퉁이 찻집",
  townhouse: "높다란 골목집",
  "red-cottage": "빨간 지붕 오두막",
  shed: "장작 헛간",
  "stone-cottage": "눈 덮인 돌집",
  "woodland-cabin": "숲속 통나무집",
  "a-frame": "강 건너 세모집",
  "blue-cottage": "파란 지붕 이웃집",
  "rose-cottage": "연못가 이웃집",
};

/** What Santa notices at buildings that aren't waiting for a gift. */
export const BUILDING_NOTES: Partial<Record<BuildingId, string>> = {
  workshop: "요정들이 밤새 포장한 선물이 선반 가득 쌓여 있어요.",
  chapel: "종탑 위로 별빛이 내려앉았어요.",
  shed: "잘 마른 장작 냄새가 나요. 썰매도 한 대 기대어 있네요.",
  "blue-cottage": "이웃들은 벌써 꿈나라예요. 마을이 밝아지면 깨어날지도 몰라요.",
  "rose-cottage": "창가에 작은 양말 하나가 걸려 있어요.",
};

export const HOUSE_NAMES: Record<HouseId, string> = BUILDING_NAMES;

export const GIFTS: Record<GiftId, { name: string; note: string }> = {
  "teddy-bear": { name: "곰 인형", note: "포근하게 안아줄 작은 친구" },
  gingerbread: { name: "진저브레드 쿠키", note: "계피 향이 솔솔 나는 쿠키" },
  stocking: { name: "크리스마스 양말", note: "밤사이 선물이 채워질 양말" },
  "snow-globe": { name: "스노우볼", note: "흔들면 작은 마을에 눈이 내려요" },
  scarf: { name: "털실 목도리", note: "한 코 한 코 정성껏 뜬 목도리" },
  "candy-cane": { name: "캔디케인", note: "달콤한 줄무늬 지팡이 사탕" },
  "mini-tree": { name: "작은 트리", note: "창가에 놓을 반짝이는 트리" },
  "golden-star": { name: "황금 별", note: "트리 꼭대기에 달 빛나는 별" },
};
