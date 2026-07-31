# 기여하기

이 프로젝트의 기본 문서 언어는 한국어이며 영어로 작성한 이슈와 Pull Request도 환영합니다.

## 이슈 제보

재현 절차, 기대한 결과와 실제 결과, 문제를 재현할 수 있는 최소한의 합성 페이지 구조를 포함해 GitHub Issues에 등록해 주세요. 비공개 문서나 기밀 페이지의 HTML 및 내용을 첨부하지 마세요.

## 개발 및 Pull Request

1. `npm install`로 의존성을 설치합니다.
2. `src/`에서 추출·변환 로직을 수정합니다. `extension/lib/`은 빌드 산출물입니다.
3. 테스트 픽스처에는 합성 HTML만 사용합니다.
4. `npm test`, `npm run build`, `npm run healthcheck`를 실행합니다.
5. 변경 사항과 검증 결과를 설명한 Pull Request를 제출합니다.

릴리스는 메인테이너가 `npm run publish`로 수행합니다.
