# Web Markdown

현재 웹페이지의 본문을 추출해 LLM 컨텍스트에 쓰기 좋은 Markdown 파일로 저장하는 Chrome 확장입니다. 변환은 브라우저 안에서만 수행하며 페이지 내용을 외부 서버로 보내지 않습니다.

## 기능

- `article`, `main`, 텍스트 밀도 등을 이용한 범용 본문 탐색
- 탐색 메뉴, 광고, 사이드바, 공유·댓글 위젯 등 일반적인 노이즈 제거
- GFM 표, 코드 펜스와 언어, 작업목록, 접힌 상세 내용 변환
- 폼의 입력값과 체크박스·라디오·select 등 선택 상태 포함
- 상대 링크의 절대 URL 변환과 문서 제목·출처 헤더 추가
- 이미지 제거 및 안전한 Markdown 파일명 생성
- Turndown과 GFM 플러그인의 로컬 번들 사용
- 새 버전 확인 배지와 로컬 Git clone 원클릭 업데이트

## 설치

1. 저장소를 clone합니다. Windows 기본 경로 예시는 `D:\git\web-md`입니다.
2. `npm install`과 `npm run build`를 실행합니다.
3. 원클릭 업데이트를 사용하려면 `updater\install-updater.bat`을 한 번 실행합니다. 관리자 권한은 필요하지 않습니다.
4. Chrome에서 `chrome://extensions`를 열고 개발자 모드를 켭니다.
5. **압축해제된 확장 프로그램을 로드합니다**를 선택하고 `extension` 폴더를 지정합니다.

```bat
git clone https://github.com/lisyoen/web-md.git D:\git\web-md
cd /d D:\git\web-md
npm install
npm run build
updater\install-updater.bat
```

## 사용법

저장할 웹페이지를 연 뒤 도구 모음의 Web Markdown 아이콘을 클릭합니다. 추출된 Markdown 파일이 브라우저의 기본 다운로드 위치에 저장됩니다.

## 자동 업데이트

업데이트는 다음 세 가지 방법으로 확인하고 적용할 수 있습니다.

1. 확장이 시작될 때와 6시간마다 새 버전을 확인합니다. 툴바에 `NEW` 배지가 보이면 새 버전이 있습니다.
2. 확장 아이콘을 우클릭하고 **업데이트 확인 및 적용**을 선택하면 로컬 clone에 `git pull --ff-only`를 실행합니다. 완료 알림이 표시되면 `chrome://extensions`에서 확장의 새로고침 버튼을 누릅니다. 이 기능은 먼저 `updater\install-updater.bat`을 실행해야 합니다.
3. 확장 메뉴를 거치지 않으려면 `updater\update.bat`을 더블클릭합니다. 전후 commit과 적용 안내가 콘솔에 표시됩니다.

확장 아이콘 우클릭 메뉴의 **릴리즈노트 보기**에서는 변경 내역을 확인할 수 있습니다.

## 개발

```sh
npm install
npm test
npm run build
npm run healthcheck
```

변환 및 추출 로직은 `src/`에서 수정합니다. 빌드가 이를 `extension/lib/`에 동기화하므로 해당 산출물을 직접 편집하지 마세요. 테스트 자료는 실제 페이지 사본이 아닌 합성 HTML만 사용합니다.
아이콘은 `assets/icon.svg`를 수정한 후 `npm run icons`로 재생성합니다.

## 제한사항

- 브라우저 내부 페이지, 확장 관리 페이지, 웹 스토어처럼 Chrome이 스크립트 주입을 금지한 페이지에서는 실행되지 않습니다.
- 로그인 벽, 캔버스 렌더링, Shadow DOM 중심 페이지에서는 본문 일부를 찾지 못할 수 있습니다.
- 사이트별 레이아웃 차이로 탐색 메뉴가 포함되거나 짧은 본문이 누락될 수 있습니다.
- 이미지와 첨부파일은 Markdown 결과에 포함하지 않습니다.

## 라이선스

이 프로젝트는 [MIT License](LICENSE)로 배포됩니다. 번들된 오픈소스의 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 참고하세요.
