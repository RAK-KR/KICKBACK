# KICKBACK

걷지 못하고, 산탄총 반동만으로 탑을 오르는 등반 게임.

## 올리는 법
이 폴더의 내용을 GitHub 저장소에 그대로 올리고 Pages를 켜면 주소로 바로 플레이됩니다. (빌드 과정 없음)

## 파일 구조
- `index.html` : 화면 뼈대(제목, 일시정지, 클리어 화면)
- `css/style.css` : 메뉴와 HUD 모양
- `js/config.js` : 중력, 반동, 탄 수 등 조작감 수치
- `js/level.js` : 발판, 탄약 상자, 구역, 안내 문구 (맵은 여기만 고치면 됩니다)
- `js/physics.js` : 이동과 충돌
- `js/render.js` : 배경, 발판, 캐릭터 그리기
- `js/fx.js` : 총구 화염, 연기, 탄피, 화면 흔들림
- `js/audio.js` : 효과음 합성
- `js/input.js` : 마우스, 터치, 키보드
- `js/storage.js` : 저장과 기록
- `js/main.js` : 게임 진행 총괄
