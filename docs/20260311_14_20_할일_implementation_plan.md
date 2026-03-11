# SyncSpace 다음 단계 개발 기획

제공해주신 기획서(`20260311_14_20_할일.md`)와 현재 구현된 코드([App.tsx](file:///d:/workspace/github/SyncSpace/sync-space-app/src/App.tsx), [RoomPage.tsx](file:///d:/workspace/github/SyncSpace/sync-space-app/src/pages/RoomPage.tsx), [DrawingCanvas.tsx](file:///d:/workspace/github/SyncSpace/sync-space-app/src/components/DrawingCanvas.tsx), [app.gateway.ts](file:///d:/workspace/github/SyncSpace/sync-space-server/src/gateway/app.gateway.ts) 등)를 분석한 결과, 1단계(인증 및 방 입장)와 기본적인 웹소켓 메세징 모델 및 LiveKit 캔버스 드로잉의 뼈대는 구축되어 있는 상태입니다.

이에 따라 **2단계(채팅 및 파일 공유)**와 **3단계(판서 고도화)**를 중심으로 구현 계획을 수립했습니다.

## Proposed Changes

---

### Phase 2: Communication Expansion (채팅 및 파일 공유)

#### [NEW] `sync-space-app/src/components/ChatPanel.tsx`
- 채팅 메시지를 표시하고 입력할 수 있는 UI 컴포넌트 추가
- Socket.io 클라이언트 연동으로 메시지 실시간 수발신
- 파일 첨부 버튼 UI 추가

#### [MODIFY] [sync-space-server/src/gateway/app.gateway.ts](file:///d:/workspace/github/SyncSpace/sync-space-server/src/gateway/app.gateway.ts)
- 현재 기초적으로 구현된 `send_message`와 `receive_message` 소켓 이벤트에 파일 타입 메시지 처리 로직 보완
- 과거 채팅 기록 DB 조회 이벤트를 추가하여 방 입장 시 이전 채팅 내용 로딩

#### [NEW] `sync-space-server/src/upload/` (신규 모듈)
- 로컬 디스크에 파일을 업로드(Multer 사용)하고 접근 URL을 반환하는 REST API/Service 구현
- 추후 S3로 쉽게 교체할 수 있도록 인터페이스 분리 설계

---

### Phase 3: Core Feature: Interactive Canvas (판서 고도화)

#### [NEW] `sync-space-app/src/components/DrawingToolbar.tsx`
- 펜 굵기 조절, 색상 변경, 지우개 모드, 전체 지우기 기능을 포함하는 툴바 UI 컴포넌트

#### [MODIFY] [sync-space-app/src/components/DrawingCanvas.tsx](file:///d:/workspace/github/SyncSpace/sync-space-app/src/components/DrawingCanvas.tsx)
- DrawingToolbar의 상태(선택된 색상, 굵기 등)를 Props로 받아 렌더링에 반영
- 지우개 기능(`globalCompositeOperation`) 및 전체 지우기 메서드(`ctx.clearRect`) 추가
- LiveKit DataChannel을 통한 원격 드로잉 동기화([DrawData](file:///d:/workspace/github/SyncSpace/sync-space-app/src/components/DrawingCanvas.tsx#3-10) 인터페이스)에 색상, 굵기, 그리기 타입(지우개 등) 전송 패킷 최적화 반영

#### [MODIFY] [sync-space-app/src/pages/RoomPage.tsx](file:///d:/workspace/github/SyncSpace/sync-space-app/src/pages/RoomPage.tsx)
- ChatPanel 및 DrawingToolbar 컴포넌트를 배치
- 투명 오버레이 통과 로직 상태 최적화

## Verification Plan

### Automated Tests
- 없음 (현재 e2e 테스트 스위트가 없으므로 수동 연동 테스트에 집중합니다.)

### Manual Verification
1. **채팅 테스트**:
   - 두 개의 서로 다른 유저로 로그인 후 동일 채널에 접속
   - 텍스트 메시지를 보내 실시간으로 확인되는지 검증
   - 첨부파일 업로드 기능을 통해 이미지가 업로드되고 채팅창에 표시되는지 검증
2. **드로잉 및 툴바 테스트**:
   - 드로잉 툴바에서 굵기, 색상을 변경 후 캔버스에 그리기 작동 확인
   - 지우개 모드를 켜서 그린 내용을 지울 수 있는지 확인
   - LiveKit 채널에 접속한 다른 클라이언트 화면에도 변경된 색상/지우개 기능이 동기화되는지 확인

---
---
---

제공해주신 20260311_14_00_할일.md 내용과 현재까지의 코드 분석 결과를 바탕으로, 프로젝트 책임 기획자로서 SyncSpace 완성 및 고도화를 위한 상세 실행 계획서를 최종 확정하여 제안합니다.

개발팀(백엔드/프론트엔드)은 이 계획서를 가이드라인으로 삼아 각 단계의 마일스톤을 달성해 주시기 바랍니다.

🚀 SyncSpace 프로젝트 상세 실행 계획서 (Action Plan)
1. 프로젝트 개요
본 프로젝트는 **'경계 없는 실시간 협업'**을 목표로 합니다. 단순한 화면 공유를 넘어, 공유된 화면 위에 실시간으로 상호작용(판서, 데이터 동기화)할 수 있는 최적의 환경을 구축합니다.

2. 단계별 개발 마일스톤 (Milestones)
기간이 아닌 기능적 완성도를 기준으로 총 4단계로 구분합니다.

[1단계] Foundation: 인증 및 채널 관리 체계 확립
가장 기본이 되는 사용자 식별과 방(Room) 관리 로직을 완성합니다.

백엔드(BE):

JWT 기반 회원가입/로그인 API 완성 및 DB 연동.

join_channel 시 데이터베이스(channel_participants) 상태 업데이트 로직 구현.

LiveKit Server와 연동하여 클라이언트용 접속 토큰 발급 API 생성.

프론트엔드(FE):

로그인 및 회원가입 전용 UI 구현.

로그인 후 채널 목록 조회, 생성, 입장이 가능한 대시보드 화면 구축.

발급받은 토큰을 이용한 LiveKit 세션 자동 연결 로직.

[2단계] Interaction: 실시간 소통 및 데이터 공유
작업 환경 내에서의 능동적인 커뮤니케이션 기능을 추가합니다.

백엔드(BE):

Socket.io 기반 실시간 채팅 로그 저장 및 전파 로직 고도화.

파일 업로드 처리를 위한 스토리지 파이프라인(S3 또는 Local) 구축.

프론트엔드(FE):

채팅 UI 및 멘션 기능 구현.

파일/이미지 드래그 앤 드롭 업로드 및 프리뷰 기능.

[3단계] Core Feature: 초저지연 양방향 판서 시스템
SyncSpace의 정체성인 '공유 화면 위 판서' 기능을 상용 수준으로 끌어올립니다.

백엔드(BE):

LiveKit SFU 서버 리소스 최적화 (1채널당 10명 이상의 동시 접속 보장).

프론트엔드(FE):

판서 고도화: 펜 색상/굵기 선택, 지우개, 전체 삭제 기능이 포함된 드로잉 툴바.

이벤트 제어: Electron의 setIgnoreMouseEvents를 활용하여 판서 모드일 때만 마우스 이벤트를 캡처하는 로직 정교화.

최적화: WebRTC DataChannel을 통한 좌표 데이터 전송 패킷 경량화 (0.5초 이내 동기화).

[4단계] Stability: 아키텍처 개선 및 최적화
장기적인 유지보수와 안정적인 서비스를 위한 마지막 단계입니다.

백엔드(BE):

헥사고널 아키텍처 적용을 통한 비즈니스 로직과 인프라 계층 분리.

서버 부하 테스트 및 비정상 종료 시 소켓 해제 로직 완결.

프론트엔드(FE):

전체 앱의 UI/UX 디자인 폴리싱 및 사용자 피드백 반영.

오프라인 상태 대응 및 예외 처리 강화.

3. 기획자 전달 사항 및 의사결정 요청
작성해주신 리뷰 내용 중 AWS S3 파일 업로드 관련 문의에 대한 가이드라인입니다.

[기획 가이드] 파일 저장 방식 관련

초기 개발 단계 (2단계 진행 시): 현재 AWS 환경 변수가 부재하므로, 개발 속도를 위해 **로컬 서버 디스크 저장 방식(Multer 등 사용)**으로 우선 구현해 주십시오. API 인터페이스만 추후 S3로 교체하기 쉽게 설계해 두시면 됩니다.

3단계 진입 전: 프로젝트 인프라가 확정되는 대로 실제 S3 자격 증명을 제공할 예정입니다. 이때 스토리지 서비스 클래스만 교체하는 방식으로 전환하겠습니다.

4. 향후 협업 가이드
백엔드 개발자: API 설계 시 Swagger 등을 통해 프론트엔드와 실시간으로 명세를 공유해 주세요. 특히 3단계의 DataChannel 패킷 규격 정의가 중요합니다.

프론트엔드 개발자: Electron 환경에서의 투명 캔버스 구현 시, 운영체제별(Windows/Mac) 클릭 이벤트 투과 현상을 면밀히 체크해 주시기 바랍니다.

이 계획에 동의하신다면, 즉시 2단계(채팅 및 로컬 파일 저장)와 3단계(판서 고도화) 개발에 착수해 주시기 바랍니다. 프로젝트의 성공적인 완성을 위해 힘써주셔서 감사합니다!