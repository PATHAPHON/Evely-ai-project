import type { ScriptStep } from './types';

export const defaultGreetingsScript: ScriptStep[] = [
  {
    id: 'step-1',
    partnerMessage: '안녕하세요! 만나서 반갑습니다. 저는 민우입니다. 이름이 무엇입니까?',
    partnerReading: 'อัน-นย็อง-ฮา-เซ-โย! มัน-นา-ซอ พัน-กัป-ซึม-นี-ดา. ชอ-นึน มิน-อู-อิม-นี-ดา. อี-รึม-อี มู-ออ-ซิม-นี-ก๊า?',
    partnerTranslation: 'สวัสดีครับ! ยินดีที่ได้รู้จักครับ ผมชื่อมินอู คุณชื่ออะไรครับ?',
    partnerRomanization: 'Annyeonghaseyo! Mannaseo bangapseumnida. Jeoneun Minu-imnida. Ireumi mueosimnika?',
    suggestions: [
      { korean: '안녕하세요! 저는 팟입니다.', translation: 'สวัสดีครับ! ผมชื่อพัทครับ' },
      { korean: '반갑습니다. 저는 팟입니다.', translation: 'ยินดีที่ได้รู้จักครับ ผมชื่อพัทครับ' },
    ],
  },
  {
    id: 'step-2',
    partnerMessage: '아, 반갑습니다! 한국어 공부를 한 지 얼마나 되었나요?',
    partnerReading: 'อา, พัน-กัป-ซึม-นี-ดา! ฮัน-กุก-ออ คง-บุ-รึล ฮัน ชี ออล-มา-นา ทเว-อ็อด-นา-โย?',
    partnerTranslation: 'อ่า ยินดีที่ได้รู้จักครับ! เรียนภาษาเกาหลีมานานเท่าไหร่แล้วครับ?',
    partnerRomanization: 'Ah, bangapseumnida! Hangugeo gongbureul han ji eolmana doeeonnayo?',
    suggestions: [
      { korean: '한 달 되었어요.', translation: 'เรียนมา 1 เดือนแล้วครับ' },
      { korean: '이제 시작했어요.', translation: 'เพิ่งเริ่มเรียนเลยครับ' },
    ],
  },
  {
    id: 'step-3',
    partnerMessage: '그렇군요! 앞으로 같이 한국어를 열심히 공부해 봐요. 감사합니다!',
    partnerReading: 'คือ-ร็อด-คุน-โย! อา-พือ-โร คา-ชี ฮัน-กุก-ออ-รึล ย็อล-ชี-มี คง-บุ-แฮ พวา-โย. คัม-ซา-ฮัม-นี-ดา!',
    partnerTranslation: 'อย่างนั้นเหรอครับ! ต่อจากนี้มาตั้งใจเรียนภาษาเกาหลีด้วยกันนะครับ ขอบคุณครับ!',
    partnerRomanization: 'Geureokgunyo! Apeuro gachi hangugeoreul yeolsimhi gongbuhae bwayo. Gamsahamnida!',
    suggestions: [
      { korean: '네, 감사합니다!', translation: 'ครับ ขอบคุณครับ!' },
      { korean: '잘 부탁드립니다.', translation: 'ฝากตัวด้วยนะครับ' },
    ],
  },
];
