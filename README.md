# Quiz Answer Helper (Chrome)

Bôi đen câu hỏi trên trang web → chuột phải → **Get đáp án** → tô xanh vùng chọn và hiện đáp án Gemini + Groq ở cuối chỗ bôi đen.

## Cài đặt (load unpacked)

1. Cài dependency và build:

```bash
npm install
npm run build
```

2. Mở Chrome → `chrome://extensions`
3. Bật **Developer mode**
4. **Load unpacked** → chọn thư mục `dist`
5. Click icon extension → dán **Gemini** và **Groq** API key → **Lưu**
6. Bấm **Test Gemini** / **Test Groq** để kiểm tra key
7. Xem log ngay trên popup, hoặc **Tải quiz-answer.log** để mở bằng Notepad

## Lấy API key miễn phí

- Gemini: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys

## Cách dùng

1. Bôi đen câu hỏi (nên kèm A/B/C/D nếu có)
2. Chuột phải → **Get đáp án**
3. Overlay hiện bên cạnh cuối vùng bôi đen:
   - Gemini trước
   - Groq sau
4. API nào lỗi / quá 10 giây sẽ không hiện slot đó
5. Mọi lần test key / gọi API đều ghi vào log (popup + file `quiz-answer.log`)

## Dev

```bash
npm run dev
```

Sau mỗi lần đổi code, bấm **Reload** extension trên `chrome://extensions`.
