# Tarnly — Blueprint (พิมพ์เขียวทั้งระบบ)

พิมพ์เขียวฉบับสมบูรณ์ตั้งแต่ต้นน้ำ (requirement) → ปลายน้ำ (ขึ้น production รองรับ 10k+ users)
ทุกไฟล์อิงโค้ดจริง + schema จริงบน Supabase ณ 2026-06-22

| ไฟล์ | ครอบคลุม | ช่วงน้ำ |
| :--- | :--- | :--- |
| [`tarnly_proposal.md`](tarnly_proposal.md) | requirement, IPO, ทฤษฎี (SM-2), schema แกนหลัก, แผนงาน, system diagram | ต้นน้ำ |
| [`prd.md`](prd.md) | PRD: KPI วัดผลได้ · personas · user stories + AC · AI eval · security · risks/roadmap | ต้นน้ำ |
| [`User Persona.md`](User%20Persona.md) | User Personas: ข้อมูลและรายละเอียดเชิงลึกของกลุ่มผู้ใช้งานหลักของระบบ | ต้นน้ำ |
| [`Tech Stack.md`](Tech%20Stack.md) | Tech Stack: เครื่องมือ ภาษา ฐานข้อมูล และ AI APIs ที่ใช้ในแอปพลิเคชัน | ต้นน้ำ |
| [`frontend-architecture.md`](frontend-architecture.md) | Next.js App Router, provider tree, routes, components, data layer ฝั่ง client | กลางน้ำ |
| [`backend-architecture.md`](backend-architecture.md) | API routes, auth, env vars, DB schema จริง, แผน migration | กลางน้ำ |
| [`database-design.md`](database-design.md) | ออกแบบฐานข้อมูล: ER Diagram, Data Directory, RLS, และตรรกะหลังบ้าน | กลางน้ำ |
| [`sitemap.md`](sitemap.md) | แผนผังเว็บไซต์, หน้าจอทั้งหมด, เส้นทางระบบ (Routing) และ API endpoints | กลางน้ำ |
| [`project-status.md`](project-status.md) | สถานะจริงต่อฟังก์ชัน (F-01…F-08), งานที่เหลือ, หนี้เทคนิค DB | สถานะ |
| [`launch-plan.md`](launch-plan.md) | roadmap ขึ้น production full-monetize: subscription, auth/account, `/refresh` มินิเกม, gating, Stripe/AdSense, profile/legal/infra | แผนงาน |
| [`system-design.md`](system-design.md) | use case · class/domain model · sequence · state · wireframe (Mermaid) | ออกแบบ |
| [`class-diagram.md`](class-diagram.md) | แผนผังโครงสร้างคลาส ข้อมูล และโมดูลบริการหลัก | ออกแบบ |
| [`flowchart.md`](flowchart.md) | แผนผังขั้นตอนการทำงานของระบบ (Overall, Chat, SM-2, Stripe Payment) | ออกแบบ |
| [`api-specification.md`](api-specification.md) | สเปก request/response ทุก API route + Phase 2 | อ้างอิง |
| [`testing-and-uat.md`](testing-and-uat.md) | test pyramid, test case F-01…F-08, edge case, UAT checklist | คุณภาพ |
| [`coding-standards.md`](coding-standards.md) | naming, โครงสร้างโฟลเดอร์, pattern state/DB, git, DoD | กระบวนการ |
| [`deployment-and-scaling.md`](deployment-and-scaling.md) | deploy/host, caching, performance, scale 10k+, monitoring, security, cost | ปลายน้ำ |

**อ่านตามลำดับ:** proposal (อยากได้อะไร) → system-design (รูประบบ) → frontend/backend + database-design (สร้างยังไง/โครงสร้าง DB) → sitemap (เส้นทางระบบ) → api-spec (เรียกใช้ยังไง) → coding-standards (เขียนยังไง) → testing-uat (ตรวจยังไง) → status (ไปถึงไหน) → deployment (ขึ้นจริง + โตยังไง)

**มาร์คสถานะที่ใช้ทั้ง Blueprint:** ✅ มีในโค้ดแล้ว · 🟡 มี logic ยังไม่มี UI · 🔵 ออกแบบไว้ (Phase 2 ยังไม่ทำ)
