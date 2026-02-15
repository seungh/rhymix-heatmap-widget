# Rhymix Heatmap Widget
Github-style heatmap widget for Rhymix

## 소개
본인이 작성한 게시글 수를 기반으로 Github 스타일의 히트맵을 보여주는 라이믹스 위젯입니다. 

<img src="https://github.com/user-attachments/assets/baaf2ea5-845d-4bb1-844b-212ff3da2728" width="600"> \
<img src="https://github.com/user-attachments/assets/25fdc25a-acab-4e4a-9737-e9c7dde11405" width="600"> \
<img alt="calendar_skin" src="https://github.com/user-attachments/assets/3195f80b-12e2-4da5-8fe7-8d2ee88e505b" width="200">

## 설치방법
* 설치경로: `./widgets/heatmap`
* 설치방법:
```bash
cd /path/to/rhymix/widgets
git clone https://github.com/seungh/rhymix-heatmap-widget.git heatmap
```
* 버전 업그레이드 방법:
```bash
cd /path/to/rhymix/widgets/heatmap
git pull
```
* 라이믹스 2.1.8 이상에서 동작합니다.
* PHP 8.2 및 라이믹스 2.1.16 환경에서 테스트했습니다.
* PHP 8.3 및 라이믹스 2.1.30 환경에서 테스트했습니다.

## 설정방법
* 스킨 (required): 사용할 스킨을 선택합니다. 
* 대상페이지 (optional): 글 작성 빈도를 보여줄 게시판을 선택합니다. 선택하지 않으면 모든 게시판을 대상으로 합니다.
* 제목 (optional): 설정값을 히트맵 좌상단에 제목으로 출력합니다. 비워두면 총 게시글 수를 보여줍니다.
* 초기화면: 처음에 보여줄 히트맵 달력의 타입을 선택합니다. 
  * 최근 365일: 오늘부터 과거 365일의 기역내역을 보여줍니다.
  * 올해: 올해 1월1일부터 12월31일까지 기여내역을 보여줍니다.
* 레벨 별 게시글 수 (optional): 게시글 수가 설정 값에 도달하면 해당 레벨의 색상코드를 출력합니다.

## 라이센스
GPL v3

