import { MessageCircle, MousePointerClick, Layers, Gamepad2 } from "lucide-react";
import FeatureSection from "./FeatureSection";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "คุย AI ภาษาอังกฤษ",
    body: "ฝึกสนทนากับ AI ที่ตอบเป็นภาษาอังกฤษเสมอ เหมือนคุยกับเพื่อนจริง",
  },
  {
    icon: MousePointerClick,
    title: "แตะคำ → รู้ทันที",
    body: "แตะคำไหนในบทสนทนาก็ได้ ดูคำแปลไทย ชนิดคำ tense และตัวอย่างประโยคทันที",
  },
  {
    icon: Layers,
    title: "คลังคำ + ทบทวน SRS",
    body: "บันทึกคำที่เจอลงคลังคำส่วนตัว ทบทวนด้วยระบบ spaced repetition (SM-2)",
  },
  {
    icon: Gamepad2,
    title: "เกมรีเฟรช + ฟัง/พูด",
    body: "ทบทวนคำด้วยมินิเกม จับคู่ พิมพ์ พูด พร้อมฝึกฟังและพูดด้วย TTS/STT",
  },
] as const;

export default function Features() {
  return (
    <section className="py-8">
      {FEATURES.map((f, i) => (
        <FeatureSection key={f.title} {...f} reversed={i % 2 === 1} />
      ))}
    </section>
  );
}
