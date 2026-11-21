# Trang Tâm sự + logo termux.io.vn — design

Ngày: 2026-11-21 · Repo: `~/GitHub/dhhieu113pro.github.io` · Live: https://termux.io.vn

## Intent

termux.io.vn là blog truyện minh họa tiếng Việt, tĩnh trên GitHub Pages, toàn bộ HTML do `scripts/sync.js` sinh ra từ DB `~/.pwterm/stories/stories.sqlite`. Hai chỗ còn trống:

1. **Không có cách nào đọc theo chủ đề.** Lối vào duy nhất là feed cover full-screen — lướt, không phân loại, không có trang mục.
2. **Không có thương hiệu hình ảnh.** Không favicon, không logo, không `og:image`. Brand chỉ là chữ "Termux.io.vn".

Việc này thêm một trang mục **Tâm sự** (gom truyện theo chủ đề) và một **logo** do AI sinh ra, dùng ở 4 chỗ.

## Goals

- `/tam-su/` do `sync.js` sinh ra, liệt kê **mọi** truyện, gom theo chủ đề.
- Tới được từ nav mọi trang bài + topbar trang chủ.
- Một file logo (sinh bằng `pwterm imagine` / KIE) dùng làm: favicon, brand mark ở topbar home, brand mark ở site header, `og:image`.
- `<meta name="description">` cho **mọi** trang: trang bài lấy `lead` của bài đó, trang chủ và trang Tâm sự có câu riêng.
- 33 test hiện tại vẫn xanh, thêm test mới.

## Non-goals (cố ý không làm)

- **Không** chat/đăng bài/bình luận — đã loại từ đầu (GitHub Pages tĩnh, không có server).
- **Không** dependency mới, không build tool, không đổi cách publish.
- **Không** bảng slug → chủ đề sửa tay: publish tự động qua `pwterm story`, bảng tay sẽ mục.
- **Không** nướng chữ vào ảnh logo (AI hay ra chữ lỗi; chữ "Termux.io.vn" vẫn là text HTML).
- **Không** đụng pipeline `pwterm story` — `sync.js` vẫn chỉ đọc DB readOnly.
- **Không** redesign CSS: dùng lại class list **đã có sẵn nhưng chưa ai dùng** (`.page-title`, `.story-list`, `.story-card`, `.story-cover-link`).
- **Không** `og:image` riêng từng bài (dùng cover bài làm ảnh chia sẻ sẽ đẹp hơn — để việc sau).

## Constraints

- **`posts/` và `assets/img/` bị `rm -rf` mỗi lần sync.** Logo **không** được nằm trong hai chỗ đó. Sơ đồ an toàn: `assets/logo.png`, `favicon.ico` ở root.
- URL asset mang `?v=` hash từ `assetVersion()` — file logo phải vào danh sách hash, nếu không đổi logo sẽ bị cache cũ.
- `shell(title, body, prefix, lockZoom, bare)` dùng cho 3 loại trang: home (`bare`, prefix `''`), bài (`prefix '../../'`), và trang mới này (`prefix '../'`). Link trong chrome phải dùng `prefix`, không hardcode.
- Trang home **không có header** (bare) → nav tới trang mới phải nằm trong `.feed-topbar`.
- README hứa "top bar **mỗi trang** đều có nút theme" → trang mới cũng phải có toggle, nhưng **không** được sinh toggle thứ hai ở trang bài.
- Test hiện có `assert.match(html, /class="feed-brand">Termux\.io\.vn/)` sẽ vỡ nếu markup đổi → phải cập nhật.
- KIE: key trong `~/.pwterm/settings.json` (`available: true`), model `minimax-h3/text-to-image`, `resolution` mặc định `1K`, **chỉ ra jpeg**. Không có ImageMagick; có `ffmpeg` (có muxer ICO) và `python3`.
- `pwterm` chạy được ở HEAD — chỉ cần `PLAYWRIGHT_BROWSERS_PATH=0` (shim tự set). Ghi cũ "kie.js bị cắt" là stale, đã sửa.

## Approaches

### 1. Phân loại cho trang Tâm sự

| | Cách | Đổi lấy |
|---|---|---|
| **A. Từ khóa** ✅ | ~15 dòng trong `sync.js`, đọc `title + lead`, không khớp → chủ đề dự | Tự chạy mỗi lần sync, bài mới vào trang ngay. Rủi ro: xếp nhầm |
| B. Bảng slug → chủ đề tay | Chính xác 100% | Mỗi bài mới phải sửa tay → sẽ mục vì publish tự động |
| C. Danh sách phẳng | Nhỏ nhất | Gần trùng feed chính, mất lý do tồn tại của trang |

**Chọn A.** Đã thử trên 4 bài thật, kết quả cân bằng và hợp lý (bảng bên dưới).

### 2. Logo

| | Cách | Đổi lấy |
|---|---|---|
| **A. Chỉ sinh mark** ✅ | `pwterm imagine` sinh 4 ứng viên → chọn 1 → `assets/logo.png`. Chữ vẫn là HTML | Không có wordmark trong ảnh chia sẻ |
| B. Sinh cả ảnh có chữ | Có wordmark sẵn | Chữ "termux.io.vn" dễ méo, không đổi màu/đổi cỡ được |
| C. Vẽ SVG tay | Nét sạch, miễn phí | Không dùng pwterm + kie.ai như yêu cầu |

**Chọn A.** Kiểu mark đề xuất: ô bo góc tối, dấu nhắc terminal `>_` phát sáng xanh lá, nhấn đỏ-vàng `.vn`.

## How — những gì đã quyết

### 1. Phân loại (A)

```js
const TOPICS = [
  { name: 'Tình yêu',          words: ['yêu', 'rung động', 'người yêu', 'hẹn hò', 'crush', 'tình yêu'] },
  { name: 'Hôn nhân & gia đình', words: ['cưới', 'kết hôn', 'chồng', 'vợ', 'mẹ chồng', 'con dâu', 'gia đình', 'đám cưới', 'lấy nhau'] },
  { name: 'Đời sống',          words: ['nghèo', 'tiền', 'công việc', 'cuộc sống', 'hoàn cảnh', 'đời'] },
];
// thứ tự quan trọng: check Tình yêu trước Hôn nhân. Không khớp → 'Chuyện khác'.
```

Kết quả thật trên 4 bài hiện có (đã chạy thử, **đây là acceptance criteria**):

| Chủ đề | Bài |
|---|---|
| Tình yêu | Nghèo nên tôi chẳng dám yêu ai · Tôi rung động với cô gái khác khi sắp cưới người yêu 17 năm |
| Hôn nhân & gia đình | Bỏ gần hết tiền tiết kiệm để sửa nhà cho mẹ chồng dù mới về làm dâu nửa năm |
| Đời sống | Anh trao chìa khóa căn nhà cho tôi sau khi 'vờ' thuê nhà và làm xe ôm |
| Chuyện khác | *(trống)* |

- Hạ tầng: `haystack = (title + ' ' + lead).toLowerCase()`, `words.some(w => haystack.includes(w))`. Giữ dấu — title/lead từ VnExpress có dấu đầy đủ.
- **Không** đọc `parts` (chậm, không cần). Chủ đề **không** có truyện → **bỏ qua**, không render heading rỗng.
- DB trống → dùng lại `EMPTY_STATE` (`Chưa có câu chuyện nào.`).

### 2. Trang `tam-su/index.html`

- Viết bởi `syncStories()`, path `outDir/tam-su/index.html`, gọi `shell('Tâm sự — Termux.io.vn', body, '../')`.
- Body: `h1.page-title` → `p.page-intro` → mỗi chủ đề `h2.topic-title` + `div.story-list` chứa các `article.story-card` (cover link + `h3` title + `p.story-meta`).
- Cover: `story.cover` đang chứa tiền tố `../../` → đổi thành `../` cho trang này (cùng cách home đang làm `.replace('../../', '')`).
- Link card trỏ `../posts/<slug>/`.
- **Chỉ emit `<img>` logo nếu file `assets/logo.png` tồn tại** (cùng pattern với ảnh part hiện tại).

### 3. Điều hướng

- `shell()` chrome: `<nav class="site-nav">` thêm `<a href="${root}tam-su/">Tâm sự</a>` → có ở mọi trang bài và trang tâm sự.
- Home topbar (bare, không header): bọc bên trái và thêm nhóm phải —

```html
<div class="feed-left"><img class="brand-mark" …><span class="feed-brand">Termux.io.vn</span></div>
<div class="feed-right"><span class="feed-count">1 / 4</span><a class="feed-link" href="tam-su/">Tâm sự</a></div>
```

  Giữ nguyên nội dung `.feed-brand` và `.feed-count` → **test cũ không vỡ**. CSS mới: `.feed-left`, `.feed-right { display:flex; gap; align-items:center }`, `.feed-link`, `.brand-mark { width:1.2em; height:1.2em; vertical-align:-0.2em }`.

### 4. Pipeline logo

1. Sinh 4 ứng viên (1 lần, tốn credit KIE):
   ```
   pwterm imagine "<prompt>" --provider kie --count 4 --name termux-mark --out ~/.pwterm/imagine/logo
   ```
   **Prompt nháp** (builder sửa cho đẹp): *flat minimalist app icon, rounded square, deep near-black charcoal background, centered glowing neon-green terminal prompt — a right-pointing chevron above a short horizontal underscore line, thin warm gold and red arc along the bottom edge, soft outer glow, high contrast, crisp edges, no words, no letters, no numbers, perfectly centered, 1:1 square*.
   → Cố ý mô tả "chevron + gạch dưới" thay vì ký tự `>_`, tránh AI vẽ chữ sai.
2. **Con người chọn** 1 trong 4 (builder dừng lại chờ chọn).
   **Ngân sách ảnh (đã chốt):** tối đa **2 batch** = 8 ảnh KIE. Batch 1 bị từ chối hết → sinh batch 2 rồi dừng hỏi lại. Batch 2 vẫn xấu → **dừng sinh ảnh, chuyển sang SVG vẽ tay (cách 2C)** để nhánh không bị kẹt và không đốt thêm credit.
3. Chuyển đổi (ffmpeg, đã thử tay — một lệnh, một file):
   ```
   ffmpeg -i <chon>.jpg -vf scale=512:512 -y assets/logo.png
   ffmpeg -i assets/logo.png -vf scale=32:32 -y favicon.ico
   ```
   **Không** commit 4 ứng viên vào repo — để ở `~/.pwterm/imagine/logo`.
4. Không dùng `.ico` nhiều kích thước (ffmpeg không gom được) — PNG 32×32 trong `.ico` là đủ cho trình duyệt hiện đại.

### 5. `<head>` (sửa `shell()`)

```html
<meta name="description" content="${desc}">
<link rel="icon" href="${prefix}favicon.ico">
<link rel="icon" href="${prefix}assets/logo.png?v=${assetVersion()}" type="image/png">
<meta property="og:image" content="https://termux.io.vn/assets/logo.png">
```

- Tham số `description` **tùy chọn** cho `shell()`. Nguồn theo loại trang:
  - **Trang bài** → `record.lead` của bài đó (đã có sẵn trong DB, nhưng `sync.js` **chưa đọc** — thêm một dòng). Mỗi trang một mô tả riêng, đúng nội dung.
  - **Trang chủ** → `HOME_DESC`.
  - **Trang Tâm sự** → câu trong bảng Copy.
  - Không truyền gì cả → `SITE_DESC` (lưới an toàn, chỉ dùng khi không có lead).
- Copy (đã chốt, public — người dùng duyệt rồi):

  | Hằng | Nội dung |
  |---|---|
  | `SITE_DESC` | `Termux.io.vn — những câu chuyện đời thường, đọc dạng thẻ trên điện thoại.` |
  | `HOME_DESC` | `Đọc truyện tâm sự đời thường của người Việt — tình yêu, hôn nhân, gia đình — dưới dạng thẻ dễ đọc trên điện thoại.` |

- Thêm `'logo.png'` vào mảng file của `assetVersion()` để đổi logo là đổi hết `?v=`.
- `favicon.ico` **không** mang `?v=` (trình duyệt cache favicon rất dai; chấp nhận — shortcut đã biết).
- `og:image` là URL tuyệt đối, `SITE_URL = 'https://termux.io.vn'` hardcode trong `sync.js` (đã có CNAME).

### 6. Copy tiếng Việt (đã chốt)

| | Nội dung |
|---|---|
| Tên nav + H1 | `Tâm sự` |
| `<title>` | `Tâm sự — Termux.io.vn` |
| Dòng dẫn | `Chuyện nhà, chuyện tình, chuyện đời — kể ra cho nhẹ lòng.` |
| Meta description | `Tâm sự trên Termux.io.vn — những câu chuyện đời thường về tình yêu, hôn nhân và gia đình người Việt, đọc dạng thẻ dễ chịu trên điện thoại.` |
| Chủ đề | `Tình yêu` · `Hôn nhân & gia đình` · `Đời sống` · `Chuyện khác` (dự) |
| Nav (site-nav + topbar) | `Tâm sự` |

### 7. Tests mới (`scripts/sync.test.js`)

1. `tam-su/index.html` được viết, có `page-title` + `page-intro`.
2. Truyện gom đúng chủ đề (fixture title chứa `yêu` / `kết hôn` / `nghèo`).
3. Không khớp từ khóa → `Chuyện khác`.
4. Chủ đề rỗng không render heading.
5. Trang bài link `href="../../tam-su/"`; home topbar link `href="tam-su/"`.
6. Có `<link rel="icon"`, `meta name="description"`, `og:image`.
7. Cover path trên trang tâm sự là `../assets/img/<slug>/…`.
8. Có `assets/logo.png` → emit `<img class="brand-mark">`; không có → không emit.
9. Cập nhật test `feed-brand` nếu markup đổi (dự kiến **không** phải đổi).

### 8. Publish

```
node scripts/sync.js
node --test scripts/sync.test.js
git add -A && git commit -m "…" && git push origin main
```

Pages live sau 30–60s. (User yêu cầu: xong nhánh là commit **và** push.)

## What's left to the builder

- Sửa prompt sinh ảnh cho đẹp, và **dừng lại cho con người chọn** 1 trong 4 ứng viên.
- Giá trị CSS chính xác (`.feed-left/.feed-right/.feed-link/.brand-mark/.topic-title/.page-intro`) — lấy theo `var(--*)` và nhịp của `style.css` hiện tại.
- Lệnh ffmpeg chính xác theo ảnh thật (tỉ lệ có thể không phải 1:1).
- Quyết định có cần `apple-touch-icon` hay không (mặc định: không).

## Verification

- `node --test scripts/sync.test.js` — 28 cũ + ~9 mới, tất cả xanh.
- Mở `tam-su/index.html` local bằng `pwterm shot` (harness browser check theo yêu cầu của partner).
- Sau push: kiểm trang thật trên https://termux.io.vn/tam-su/.
