// 게임 전체 수치. 조작감/난이도는 이 파일만 고치면 됩니다.
export const C = {
  WORLD_W: 1400,        // 월드 가로 폭
  UNIT_PER_M: 40,       // 1m = 40 유닛
  GRAVITY: 1900,
  RECOIL: 740,          // 한 발 반동 속도
  FIRE_CD: 0.2,         // 연사 간격(초)
  MAG: 2,               // 탄창
  RELOAD_TIME: 0.3,     // 착지 후 재장전까지 걸리는 시간
  MAX_SPEED: 1600,
  HW: 13, HH: 20,       // 플레이어 판정 절반 크기
  FRICTION: 14,         // 일반 바닥 마찰
  ICE_FRICTION: 0.9,   // 얼음 마찰
  AIR_DRAG: 0.12,
  WALL_REST: 0.3,       // 벽 튕김
  BOUNCE_V: 1250,       // 스프링 발판 속도
  CRATE_R: 36,          // 탄약 상자 획득 반경
  CRATE_RESPAWN: 2.5,
  FALL_NOTICE: 240,     // 이 높이 이상 떨어지면 추락으로 기록
  STEP: 1 / 120,
  VIEW_W: 1400, VIEW_H: 1050,
};
