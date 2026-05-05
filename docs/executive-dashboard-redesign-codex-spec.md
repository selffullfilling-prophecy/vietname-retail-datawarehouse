# Codex Spec — Zentra-Inspired Interactive Executive Dashboard for SSAS Browser

## 0. Main goal

Redesign the current SSAS browser frontend into an **interactive executive dashboard** inspired by modern BI/business analytics dashboards.

Use the Dribbble reference only as visual and interaction inspiration:

```text
https://dribbble.com/shots/26446179-Dashboard-for-payment-and-business-analytics
```

Borrow these ideas only:

```text
KPI-first overview
large clean analytics cards
hover tooltip on chart
clickable chart elements
period filters
contextual insights
decision-support layout
```

Do **not** copy the design exactly.

This is primarily a **frontend/UI task**. The backend and SSAS integration already work. Do not break them.

---

## 1. Non-negotiable backend rules

### 1.1 Do not modify backend

Do not modify files under:

```text
apps/analytics-api/
```

unless absolutely unavoidable.

Do not change:

```text
SSAS server
SSAS catalog
SSAS cube name
MDX query logic
provider classes
controllers
routes
connection strings
.env backend values
```

Current SSAS configuration must remain:

```text
SSAS server: localhost
Catalog: RetailAnalytics_SSAS
Cube: Retail Analytics Cube
```

Important:

```text
localhost = SSAS
localhost,1433 = relational SQL Server
```

Do not use `localhost,1433` for SSAS/MDX queries.

### 1.2 Use existing API only

Before changing UI, inspect:

```text
apps/web/src/services/api.ts
```

Use existing API functions and response shapes.

Do not invent new backend endpoints.

If a desired endpoint is missing:

```text
Do not edit backend.
Do not create a fake API route.
Do not change MDX provider.
Show a clean frontend placeholder.
Mention the missing endpoint in final notes.
```

### 1.3 Final diff rule

Before final response, run:

```powershell
git diff --name-only
```

Backend files under `apps/analytics-api/` should not appear in the diff. If they do, explain exactly why.

---

## 2. Target user

Primary user:

```text
Giám đốc công ty bán lẻ
```

The UI should help this user answer:

```text
Doanh thu đang tăng hay giảm?
Khu vực nào đóng góp nhiều nhất?
Khách hàng/nhóm khách hàng nào quan trọng?
Tồn kho có rủi ro ở đâu?
Tôi nên bấm vào đâu để xem chi tiết?
```

The default UI must not require understanding:

```text
SSAS
OLAP
MDX
Cube
Dimension
Measure
Slice
Dice
Drill
Pivot
memberUniqueName
```

Technical analysis can remain, but only inside an explicitly opened advanced section.

---

## 3. Visual direction

Use a style inspired by the Zentra/Dribbble dashboard:

```text
light background
large rounded dashboard canvas
top navigation
large page title
date/year filters on the right
white cards with soft shadows
big KPI numbers
chart cards with hover tooltips
contextual insight cards
clear "what to explore next" feeling
```

Adapt it to retail analytics:

```text
Payments -> Doanh thu
Gross Volume -> Doanh thu
Transactions -> Sản lượng bán
Retention/Customers -> Khách hàng
Insights -> Điểm cần chú ý
Balances/Products -> Tồn kho / Sản phẩm
```

Do not overuse decorative gradients. Prefer a clean, stable university-project implementation.

---

## 4. Information architecture

The app should have these conceptual areas:

```text
Tổng quan điều hành
Doanh thu
Tồn kho
Phân tích nâng cao
```

If the current routing has only three tabs, do not force a backend change. Frontend may keep three top tabs and put `Phân tích nâng cao` behind a collapsible panel.

| Page | Purpose |
|---|---|
| Tổng quan điều hành | One-screen executive summary |
| Doanh thu | Interactive revenue exploration |
| Tồn kho | Inventory monitoring and risk points |
| Phân tích nâng cao | Existing OLAP/table/pivot browser for technical demo |

---

## 5. Required dashboard behavior

### 5.1 Hover tooltip

Every major chart should support hover tooltip.

Tooltip content:

```text
Label
Primary metric
Secondary metric if available
Share/percent if easy
Hint: Bấm để xem chi tiết
```

Example:

```text
Miền Trung
Doanh thu: 75,3 tỷ VNĐ
Sản lượng bán: 84.200 đơn vị
Tỷ trọng: 38%
Bấm để xem chi tiết
```

Never show in tooltip:

```text
memberUniqueName
raw MDX
technical key
debug info
```

### 5.2 Click-to-drill-down

If current API response supports hierarchy/drill, chart items should be clickable.

Use business language:

```text
Bấm để xem chi tiết
Xem chi tiết
```

not:

```text
Drill down
```

Supported drill patterns if existing API supports them:

```text
Time: Năm -> Quý -> Tháng
Store: Vùng/Bang -> Thành phố -> Cửa hàng
Customer: Vùng/Bang -> Thành phố -> Khách hàng
Inventory Store: Vùng/Bang -> Thành phố -> Cửa hàng
```

If a drill path is not supported by existing API, do not change backend. Show the chart as non-drillable.

### 5.3 Roll-up/back

Every drillable chart must show one of:

```text
Breadcrumb trail
Back button
```

Labels:

```text
Quay lại
Quay lại tổng quan
Quay lại cấp trước
```

not:

```text
Roll up
```

### 5.4 Slice/dice as filter

Use business filters:

```text
Toàn kỳ
2022
2023
2024
2025
Khu vực
Sản phẩm
Khách hàng
```

Label group:

```text
Lọc nhanh
```

Do not show:

```text
Slice
Dice
```

### 5.5 Pivot as comparison

If current UI has pivot, rename it on executive pages:

```text
So sánh 2 chiều
```

Do not show `Pivot` on default pages.

---

## 6. DashboardPage target layout

Update:

```text
apps/web/src/pages/DashboardPage.tsx
```

Required layout:

```text
Top navigation/header
  Left: Hệ thống quản trị điều hành
  Right: Tổng quan điều hành | Doanh thu | Tồn kho

Page title area
  Eyebrow: TỔNG QUAN
  Title: Tổng quan điều hành
  Subtitle: Theo dõi doanh thu, tồn kho và khách hàng từ hệ thống phân tích.
  Filter buttons: Toàn kỳ, 2022, 2023, 2024, 2025

KPI strip
  Doanh thu
  Sản lượng bán
  Tồn kho trung bình
  Khu vực nổi bật
  Nhóm khách hàng nổi bật

Main analytics row
  Large card: Xu hướng doanh thu
    - chart
    - hover tooltip
    - click to drill if supported
  Right card: Top khu vực/cửa hàng theo doanh thu
    - horizontal bars
    - hover tooltip
    - click to drill if supported

Second row
  Left card: Khách hàng theo khu vực
    - use existing customer data if available
    - otherwise clean placeholder, no backend change
  Right card: Điểm cần chú ý về tồn kho
    - insight cards or top-list
    - business language only

Advanced panel
  Collapsed by default
  Button: Mở phân tích nâng cao
  When expanded: show existing technical table/browser content if available
```

The overview page must not become a giant table. It should be an at-a-glance dashboard.

---

## 7. SalesPage target layout

Update:

```text
apps/web/src/pages/SalesPage.tsx
```

Required layout:

```text
Eyebrow: DOANH THU
Title: Theo dõi doanh thu theo thời gian, khu vực và khách hàng
Subtitle: Màn hình mặc định dùng ngôn ngữ kinh doanh; phân tích nâng cao được ẩn riêng.

KPI strip
  Doanh thu
  Tăng/giảm
  Sản lượng bán
  Khách hàng đóng góp lớn

View switch
  Theo thời gian
  Theo khu vực cửa hàng
  Theo khách hàng
  So sánh 2 chiều

Selected view area
  Chart first
  Table/detail second
  Hover tooltip
  Click-to-drill if supported
  Breadcrumb/back if drilled

Advanced analysis
  collapsed by default
```

### Customer view

If current frontend/backend already has customer breakdown data, use it.

Expected labels:

```text
Khách hàng theo khu vực
Vùng / Bang
Thành phố
Khách hàng
Xem chi tiết
Quay lại
```

Do not show:

```text
memberUniqueName
```

If customer endpoint is missing:

```text
Show: Tính năng phân tích khách hàng đang chờ API customer-breakdown.
Do not edit backend.
```

---

## 8. InventoryPage target layout

Update:

```text
apps/web/src/pages/InventoryPage.tsx
```

Required layout:

```text
Eyebrow: TỒN KHO
Title: Tồn kho trung bình và điểm cần chú ý
Subtitle: Tập trung vào rủi ro tồn kho cao theo khu vực và cửa hàng.

KPI strip
  Tồn kho trung bình
  Tăng/giảm tồn kho
  Khu vực tồn kho cao
  Phạm vi đang xem

Main row
  Xu hướng tồn kho
  Tồn kho cao theo khu vực/cửa hàng

Second row
  Điểm cần chú ý
  Optional: Top sản phẩm tồn kho cao if existing API supports it

Advanced analysis
  collapsed by default
```

Inventory is a snapshot/semi-additive subject.

Use business language:

```text
Tồn kho trung bình
```

Do not present summed inventory across multiple time periods as the primary executive metric.

Do not add customer analysis to inventory unless existing API already supports it.

---

## 9. Component plan

Prefer to add or reuse small frontend-only components under:

```text
apps/web/src/components/
```

Recommended components:

```text
ExecutiveKpiCard.tsx
DashboardPanel.tsx
InteractiveBarChart.tsx
InteractiveTrendChart.tsx
ChartTooltip.tsx
BreadcrumbTrail.tsx
InsightCard.tsx
AdvancedAnalysisToggle.tsx
```

If existing components can be reused, reuse them.

---

## 10. Styling guidance

Use a consistent visual system.

Suggested CSS characteristics:

```text
background: light gray or off-white
header: dark navy
accent: warm yellow for active nav/filter
secondary accent: teal for charts
cards: white, rounded 16-24px
shadow: subtle
spacing: generous
font: existing project font/system font
```

Do not over-style with too many colors. Do not add visual noise.

---

## 11. Data formatting

Use reusable formatting helpers if present. Otherwise add frontend helpers.

Needed formats:

```text
currency VND
large number short format
integer quantity
percentage
```

Examples:

```text
49,4 tỷ VNĐ
200.814 đơn vị
11.774.536 đơn vị
-1.5%
```

---

## 12. Empty/loading/error states

Every dashboard panel must handle:

```text
Đang tải dữ liệu...
Chưa có dữ liệu cho bộ lọc hiện tại.
Không thể tải dữ liệu. Vui lòng kiểm tra API.
```

Do not show raw exception stack traces.

---

## 13. Technical language ban on default screens

Default screens must not show:

```text
OLAP
MDX
Cube
Dimension
Measure
Slice
Dice
Drill
Pivot
memberUniqueName
UniqueName
```

Allowed only in advanced analysis section.

Use:

```text
Xem chi tiết
Quay lại
Lọc nhanh
So sánh 2 chiều
```

---

## 14. Test/build requirements

After changes, run:

```powershell
git diff --name-only
```

Check that backend files are not changed.

Then run:

```powershell
cd apps/analytics-api
dotnet build
```

Then run:

```powershell
cd apps/web
npm run build
```

Final response must include:

```text
Files changed
Whether backend was changed
Confirmation SSAS config unchanged
UI changes summary
Chart interactions summary
Build results
Missing endpoints/placeholders, if any
```

---

# Codex Prompt

Use this exact prompt:

```text
You are working in the repository `vietname-retail-ssas` on branch `new-ssas`.

This is a frontend/UI task. The backend and SSAS integration are already working. Do not break them.

IMPORTANT: Read this file first and follow it exactly:
docs/zentra-inspired-executive-dashboard-codex-spec.md

Use this Dribbble reference only as visual/interaction inspiration:
https://dribbble.com/shots/26446179-Dashboard-for-payment-and-business-analytics

Do not copy the design exactly. Borrow only the UX ideas:
- KPI-first overview
- large clean analytics cards
- hover tooltip on chart
- clickable chart elements
- period filters
- contextual insights
- decision-support layout

Hard backend rules:
- Do not modify backend files under `apps/analytics-api/` unless absolutely unavoidable.
- Do not change SSAS server/catalog/cube configuration.
- Keep:
  - SSAS server: localhost
  - Catalog: RetailAnalytics_SSAS
  - Cube: Retail Analytics Cube
- Do not change MDX providers, controllers, routes, or connection strings.
- Do not use localhost,1433 for SSAS.
- Use existing frontend API functions and existing backend endpoints.
- If a desired endpoint is missing, do not implement backend in this task; add a frontend placeholder and mention it in final notes.

Goal:
Redesign the frontend into a modern interactive executive dashboard for a retail company director.

Pages to update:
- apps/web/src/pages/DashboardPage.tsx
- apps/web/src/pages/SalesPage.tsx
- apps/web/src/pages/InventoryPage.tsx
- apps/web/src/services/api.ts only if needed for existing endpoints
- apps/web/src/components/ as needed
- CSS/style files as needed

Do not rewrite the app.
Do not remove existing technical analysis.
Wrap technical analysis under:
- "Mở phân tích nâng cao"
- "Ẩn phân tích nâng cao"

DashboardPage:
- Use a Zentra-inspired layout:
  - top dark header
  - large page title
  - year filter buttons
  - KPI card strip
  - large revenue trend chart
  - top region/store bar chart
  - customer insight card
  - inventory attention card
  - advanced analysis collapsed by default
- Charts must have hover tooltips.
- Chart items should be clickable for drill-down if current API data supports it.
- Add breadcrumb/back when drill-down happens.

SalesPage:
- Use business view switch:
  - Theo thời gian
  - Theo khu vực cửa hàng
  - Theo khách hàng
  - So sánh 2 chiều
- Make chart the primary display.
- Add hover tooltips.
- Add click-to-drill-down where current API supports hierarchy.
- Do not display memberUniqueName.
- If customer API is missing, show a clean placeholder instead of changing backend.

InventoryPage:
- Focus on inventory monitoring and risk:
  - Tồn kho trung bình
  - Xu hướng tồn kho
  - Tồn kho cao theo khu vực/cửa hàng
  - Điểm cần chú ý
- Do not add customer analysis to inventory unless already supported.
- Use hover tooltips and chart-first panels where possible.

Components:
Prefer small custom CSS/SVG components, no heavy chart library:
- ExecutiveKpiCard
- DashboardPanel
- InteractiveBarChart
- InteractiveTrendChart
- ChartTooltip
- BreadcrumbTrail
- InsightCard
- AdvancedAnalysisToggle

Default UI must not show these technical words:
- OLAP
- MDX
- Cube
- Dimension
- Measure
- Slice
- Dice
- Drill
- Pivot
- memberUniqueName
- UniqueName

Use business Vietnamese:
- Doanh thu
- Sản lượng bán
- Tồn kho trung bình
- Khu vực dẫn đầu
- Khách hàng đóng góp lớn
- Xem chi tiết
- Quay lại
- Quay lại tổng quan
- So sánh 2 chiều
- Lọc nhanh
- Điểm cần chú ý

Required checks:
- Run `git diff --name-only` and ensure backend files are not changed unless explicitly justified.
- Run `dotnet build` in `apps/analytics-api`.
- Run `npm run build` in `apps/web`.

Final response:
- List files changed.
- Confirm whether backend files were changed. If yes, explain why.
- Confirm SSAS config remained unchanged.
- Summarize UI changes.
- Summarize chart interactions added.
- State build results.
- State any missing endpoint placeholders.
```
