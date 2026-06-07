'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { koreanLessons } from '@/app/chat-lessons/_lib/lessonCatalogData';
import type { ScriptStep, PreLoadedLesson, LessonCategory } from '@/app/chat-lessons/_lib/types';
import { supabase } from '@/app/_lib/supabaseClient';

export default function LessonsPage() {
  const router = useRouter();

  // --- Manage Lessons Catalog State (Supabase dynamic CRUD) ---
  const [dbLessons, setDbLessons] = useState<PreLoadedLesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // Form State for custom lessons
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingLesson, setEditingLesson] = useState<Partial<PreLoadedLesson>>({});
  const [newWord, setNewWord] = useState('');
  const [lessonScriptSteps, setLessonScriptSteps] = useState<ScriptStep[]>([]);

  // Load lessons from database
  useEffect(() => {
    fetchDbLessons();
  }, []);

  // Fetch lessons from Supabase table `catalog_lessons`
  const fetchDbLessons = async () => {
    setIsLoadingLessons(true);
    try {
      const { data, error } = await supabase
        .from('catalog_lessons')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        const mapped: PreLoadedLesson[] = data.map((row) => ({
          id: row.id,
          titleTh: row.title_th,
          titleEn: row.title_en,
          category: row.category as LessonCategory,
          proficiencyLevel: row.proficiency_level,
          targetLanguage: row.target_language,
          descriptionTh: row.description_th,
          descriptionEn: row.description_en,
          wordContext: row.word_context || [],
          goal: row.goal,
          systemContext: row.system_context || '',
          icon: row.icon || 'BookOutlined',
          type: row.type || 'ai',
          scriptSteps: row.script_steps || [],
        }));
        setDbLessons(mapped);
      }
    } catch (err) {
      console.error('Error fetching database catalog lessons:', err);
      antdMessage.error('ดึงข้อมูลบทเรียนจากเซิร์ฟเวอร์ล้มเหลว');
    } finally {
      setIsLoadingLessons(false);
    }
  };

  // --- Manage Lessons Catalog CRUD Functions ---
  const handleOpenCreateForm = () => {
    setFormMode('create');
    setEditingLesson({
      titleTh: '',
      titleEn: '',
      category: 'greetings',
      proficiencyLevel: 'beginner',
      targetLanguage: 'korean',
      descriptionTh: '',
      descriptionEn: '',
      wordContext: [],
      goal: '',
      systemContext: '',
      icon: 'BookOutlined',
      type: 'ai',
    });
    setLessonScriptSteps([
      {
        id: `step-${crypto.randomUUID()}`,
        partnerMessage: '',
        partnerReading: '',
        partnerTranslation: '',
        partnerRomanization: '',
        suggestions: [{ korean: '', translation: '' }],
      },
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (lesson: PreLoadedLesson) => {
    setFormMode('edit');
    setEditingLesson({ ...lesson });
    setLessonScriptSteps(lesson.scriptSteps || [
      {
        id: `step-${crypto.randomUUID()}`,
        partnerMessage: '',
        partnerReading: '',
        partnerTranslation: '',
        partnerRomanization: '',
        suggestions: [{ korean: '', translation: '' }],
      },
    ]);
    setIsFormOpen(true);
  };

  const handleDeleteLesson = async (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้? การดำเนินการนี้จะลบสคริปต์สนทนาทั้งหมดด้วย')) {
      try {
        const { error } = await supabase.from('catalog_lessons').delete().eq('id', id);
        if (error) throw error;
        antdMessage.success('ลบบทเรียนเรียบร้อยแล้ว');
        fetchDbLessons();
      } catch (err) {
        console.error('Failed to delete lesson:', err);
        antdMessage.error('ลบบทเรียนล้มเหลว');
      }
    }
  };

  const handleAddWord = () => {
    const word = newWord.trim();
    if (!word) return;
    const currentWords = editingLesson.wordContext || [];
    if (currentWords.includes(word)) {
      antdMessage.warning('มีคำศัพท์นี้อยู่แล้ว');
      return;
    }
    setEditingLesson((prev) => ({
      ...prev,
      wordContext: [...currentWords, word],
    }));
    setNewWord('');
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setEditingLesson((prev) => ({
      ...prev,
      wordContext: (prev.wordContext || []).filter((w) => w !== wordToRemove),
    }));
  };

  const updateFormStepField = (index: number, field: keyof ScriptStep, value: any) => {
    setLessonScriptSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, [field]: value } : step))
    );
  };

  const updateFormSuggestion = (stepIndex: number, suggIndex: number, field: 'korean' | 'translation', value: string) => {
    setLessonScriptSteps((prev) =>
      prev.map((step, idx) => {
        if (idx === stepIndex) {
          const newSuggestions = [...step.suggestions];
          newSuggestions[suggIndex] = { ...newSuggestions[suggIndex], [field]: value };
          return { ...step, suggestions: newSuggestions };
        }
        return step;
      })
    );
  };

  const addFormSuggestion = (stepIndex: number) => {
    setLessonScriptSteps((prev) =>
      prev.map((step, idx) => {
        if (idx === stepIndex) {
          return { ...step, suggestions: [...step.suggestions, { korean: '', translation: '' }] };
        }
        return step;
      })
    );
  };

  const deleteFormSuggestion = (stepIndex: number, suggIndex: number) => {
    setLessonScriptSteps((prev) =>
      prev.map((step, idx) => {
        if (idx === stepIndex) {
          const newSuggestions = step.suggestions.filter((_, sIdx) => sIdx !== suggIndex);
          return { ...step, suggestions: newSuggestions };
        }
        return step;
      })
    );
  };

  const addFormStep = () => {
    const newStep: ScriptStep = {
      id: `step-${crypto.randomUUID()}`,
      partnerMessage: '',
      partnerReading: '',
      partnerTranslation: '',
      partnerRomanization: '',
      suggestions: [{ korean: '', translation: '' }],
    };
    setLessonScriptSteps((prev) => [...prev, newStep]);
    antdMessage.success('เพิ่มขั้นตอนสนทนาใหม่ในสคริปต์แล้ว');
  };

  const deleteFormStep = (index: number) => {
    if (lessonScriptSteps.length <= 1) {
      antdMessage.error('คุณต้องมีขั้นตอนสนทนาอย่างน้อย 1 ขั้นตอน');
      return;
    }
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบขั้นตอนที่ ${index + 1}?`)) {
      setLessonScriptSteps((prev) => prev.filter((_, idx) => idx !== index));
      antdMessage.success(`ลบขั้นตอนที่ ${index + 1} เรียบร้อยแล้ว`);
    }
  };

  const moveFormStepUp = (index: number) => {
    if (index === 0) return;
    setLessonScriptSteps((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      return list;
    });
  };

  const moveFormStepDown = (index: number) => {
    if (index === lessonScriptSteps.length - 1) return;
    setLessonScriptSteps((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      return list;
    });
  };

  // Submit custom lesson to database
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!editingLesson.titleTh?.trim() || !editingLesson.titleEn?.trim()) {
      antdMessage.error('กรุณากรอกชื่อบทเรียนให้ครบถ้วน');
      return;
    }
    if (!editingLesson.descriptionTh?.trim() || !editingLesson.descriptionEn?.trim()) {
      antdMessage.error('กรุณากรอกคำอธิบายให้ครบถ้วน');
      return;
    }
    if (!editingLesson.goal?.trim()) {
      antdMessage.error('กรุณากรอกเป้าหมายสนทนา');
      return;
    }

    // Type specific validation
    if (editingLesson.type === 'ai' && !editingLesson.systemContext?.trim()) {
      antdMessage.error('กรุณากรอก Prompt ระบบสำหรับ AI');
      return;
    }

    if (editingLesson.type === 'choice') {
      // Validate all script steps
      for (let i = 0; i < lessonScriptSteps.length; i++) {
        const step = lessonScriptSteps[i];
        if (!step.partnerMessage.trim()) {
          antdMessage.error(`กรุณากรอกประโยคภาษาเกาหลีในขั้นตอนที่ ${i + 1}`);
          return;
        }
        if (!step.partnerReading.trim()) {
          antdMessage.error(`กรุณากรอกคำอ่านภาษาไทยในขั้นตอนที่ ${i + 1}`);
          return;
        }
        if (!step.partnerTranslation.trim()) {
          antdMessage.error(`กรุณากรอกคำแปลภาษาไทยในขั้นตอนที่ ${i + 1}`);
          return;
        }
        if (step.suggestions.length === 0) {
          antdMessage.error(`กรุณาเพิ่มตัวเลือกคำตอบอย่างน้อย 1 ข้อในขั้นตอนที่ ${i + 1}`);
          return;
        }
        for (let j = 0; j < step.suggestions.length; j++) {
          const sug = step.suggestions[j];
          if (!sug.korean.trim() || !sug.translation.trim()) {
            antdMessage.error(`กรุณากรอกข้อมูลสำหรับตัวเลือกที่ ${j + 1} ในขั้นตอนที่ ${i + 1} ให้ครบถ้วน`);
            return;
          }
        }
      }
    }

    try {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) {
        antdMessage.error('ไม่พบการยืนยันตัวตนผู้ใช้');
        return;
      }

      const payload = {
        user_id: userId,
        title_th: editingLesson.titleTh.trim(),
        title_en: editingLesson.titleEn.trim(),
        category: editingLesson.category,
        proficiency_level: editingLesson.proficiencyLevel,
        target_language: editingLesson.targetLanguage || 'korean',
        description_th: editingLesson.descriptionTh.trim(),
        description_en: editingLesson.descriptionEn.trim(),
        word_context: editingLesson.wordContext || [],
        goal: editingLesson.goal.trim(),
        system_context: editingLesson.type === 'ai' ? editingLesson.systemContext?.trim() : '',
        icon: editingLesson.icon || 'BookOutlined',
        type: editingLesson.type || 'ai',
        script_steps: editingLesson.type === 'choice' ? lessonScriptSteps : null,
      };

      if (formMode === 'create') {
        const { error } = await supabase.from('catalog_lessons').insert(payload);
        if (error) throw error;
        antdMessage.success('สร้างบทเรียนใหม่สำเร็จ! 🎉');
      } else {
        const { error } = await supabase
          .from('catalog_lessons')
          .update(payload)
          .eq('id', editingLesson.id);
        if (error) throw error;
        antdMessage.success('แก้ไขข้อมูลบทเรียนสำเร็จ! ✏️');
      }

      setIsFormOpen(false);
      fetchDbLessons();
    } catch (err) {
      console.error('Failed to save lesson catalog:', err);
      antdMessage.error('บันทึกข้อมูลบทเรียนไม่สำเร็จ');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
      {/* Main Header */}
      <header className="flex items-center justify-between border-b-3 border-border-color bg-white dark:bg-[#2d2d44] px-6 py-4 shadow-nb-sm z-10">
        <div>
          <h1 className="text-base font-black text-text-primary leading-tight">
            การจัดการบทเรียนภาษาเกาหลี
          </h1>
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
            Manage Korean Lessons (Supabase)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateForm}
          className="flex h-9 items-center gap-1.5 px-4 rounded-xl border-3 border-border-color bg-accent-yellow text-black shadow-nb-sm transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold text-xs cursor-pointer"
        >
          <PlusOutlined />
          <span>เพิ่มบทเรียนใหม่</span>
        </button>
      </header>

      {/* Render Area */}
      <main className="flex-1 overflow-y-auto p-6 relative">
        <div className="w-full flex flex-col gap-6">
          {isLoadingLessons && dbLessons.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <span className="font-bold text-text-secondary text-sm">กำลังดึงข้อมูลบทเรียน...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {/* Custom database-generated lessons */}
              {dbLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-5 shadow-nb-md relative flex flex-col justify-between gap-4 border-accent-blue"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg border-2 border-border-color bg-accent-pink-bg px-2 py-0.5 text-[10px] font-black text-black">
                        {lesson.category.toUpperCase()}
                      </span>
                      <div className="flex gap-1.5">
                        <span className="rounded-lg border-2 border-border-color bg-accent-blue text-white px-2 py-0.5 text-[10px] font-black uppercase">
                          สร้างเอง
                        </span>
                        <span className="rounded-lg border-2 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary px-2 py-0.5 text-[10px] font-black uppercase">
                          {lesson.type === 'choice' ? 'ตอบตัวเลือก' : 'คุยกับ AI'}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-base font-black text-text-primary mt-1">
                      {lesson.titleTh} / {lesson.titleEn}
                    </h3>
                    <p className="text-xs font-semibold text-text-secondary line-clamp-2">
                      {lesson.descriptionTh}
                    </p>
                    <div className="text-[11px] font-semibold text-text-secondary mt-1 flex items-start gap-1">
                      <span className="text-accent-yellow">🎯</span>
                      <span><strong>เป้าหมาย:</strong> {lesson.goal}</span>
                    </div>
                  </div>

                  {/* CRUD actions for database custom lesson */}
                  <div className="flex gap-2.5 mt-2 pt-3 border-t border-gray-100 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => handleOpenEditForm(lesson)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary font-bold text-xs shadow-nb-sm active:translate-y-[1px] cursor-pointer"
                    >
                      <EditOutlined style={{ fontSize: 12 }} />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-3 border-border-color bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold text-xs shadow-nb-sm active:translate-y-[1px] cursor-pointer"
                    >
                      <DeleteOutlined style={{ fontSize: 12 }} />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Static system lessons (un-editable) */}
              {koreanLessons.filter((lesson) => lesson.id !== 'kr-greetings-basic').map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-5 shadow-nb-md relative flex flex-col justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg border-2 border-border-color bg-accent-pink-bg px-2 py-0.5 text-[10px] font-black text-black">
                        {lesson.category.toUpperCase()}
                      </span>
                      <div className="flex gap-1.5">
                        <span className="rounded-lg border-2 border-border-color bg-gray-200 dark:bg-gray-800 text-text-secondary px-2 py-0.5 text-[10px] font-black uppercase">
                          ระบบ
                        </span>
                        <span className="rounded-lg border-2 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary px-2 py-0.5 text-[10px] font-black uppercase">
                          {lesson.id === 'kr-greetings-basic' ? 'ตอบตัวเลือก' : 'คุยกับ AI'}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-base font-black text-text-primary mt-1">
                      {lesson.titleTh} / {lesson.titleEn}
                    </h3>
                    <p className="text-xs font-semibold text-text-secondary line-clamp-2">
                      {lesson.descriptionTh}
                    </p>
                    <div className="text-[11px] font-semibold text-text-secondary mt-1 flex items-start gap-1">
                      <span className="text-accent-yellow">🎯</span>
                      <span><strong>เป้าหมาย:</strong> {lesson.goal}</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold text-center text-text-secondary bg-gray-50 dark:bg-gray-800/40 p-2 rounded-xl border border-gray-200 dark:border-white/5 mt-2">
                    🔒 บทเรียนเริ่มต้นของระบบ ไม่สามารถแก้ไขหรือลบได้
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* CRUD Form Overlay (Modal) for Custom Lessons */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Form Modal Box */}
          <div className="relative w-full max-w-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-6 rounded-2xl shadow-nb-lg z-10 animate-bubble-pop-in flex flex-col h-[90dvh] min-h-0">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-border-color pb-3 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-accent-red">
                  {formMode === 'create' ? 'เพิ่มบทเรียนใหม่' : 'แก้ไขบทเรียน'}
                </span>
                <h3 className="text-lg font-black text-text-primary leading-tight mt-0.5">
                  {formMode === 'create' ? 'สร้างบทเรียนการสนทนาใหม่' : `แก้ไข: ${editingLesson.titleTh}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-border-color flex items-center justify-center font-extrabold hover:bg-accent-pink-bg hover:text-black transition-colors cursor-pointer text-text-primary text-sm shadow-nb-sm"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto py-4 pr-1 flex flex-col gap-4">
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ชื่อบทเรียน (ภาษาไทย) *</label>
                  <input
                    type="text"
                    required
                    value={editingLesson.titleTh || ''}
                    onChange={(e) => setEditingLesson((prev) => ({ ...prev, titleTh: e.target.value }))}
                    placeholder="เช่น ซื้อกาแฟยามเช้า"
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ชื่อบทเรียน (ภาษาอังกฤษ) *</label>
                  <input
                    type="text"
                    required
                    value={editingLesson.titleEn || ''}
                    onChange={(e) => setEditingLesson((prev) => ({ ...prev, titleEn: e.target.value }))}
                    placeholder="e.g. Buying Morning Coffee"
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">หมวดหมู่ *</label>
                  <select
                    value={editingLesson.category || 'greetings'}
                    onChange={(e) => setEditingLesson((prev) => ({ ...prev, category: e.target.value as LessonCategory }))}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value="greetings">ทักทาย (Greetings)</option>
                    <option value="travel">การเดินทาง (Travel)</option>
                    <option value="food">อาหาร (Food)</option>
                    <option value="daily">ชีวิตประจำวัน (Daily Life)</option>
                    <option value="shopping">ช้อปปิ้ง (Shopping)</option>
                    <option value="culture">วัฒนธรรม (Culture)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ระดับความโปร่งใส *</label>
                  <select
                    value={editingLesson.proficiencyLevel || 'beginner'}
                    onChange={(e) => setEditingLesson((prev) => ({ ...prev, proficiencyLevel: e.target.value as any }))}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value="beginner">ระดับเริ่มต้น (Beginner)</option>
                    <option value="intermediate">ระดับกลาง (Intermediate)</option>
                    <option value="advanced">ระดับสูง (Advanced)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">ไอคอนแสดงผล *</label>
                  <select
                    value={editingLesson.icon || 'BookOutlined'}
                    onChange={(e) => setEditingLesson((prev) => ({ ...prev, icon: e.target.value }))}
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue cursor-pointer"
                  >
                    <option value="BookOutlined">📚 Book</option>
                    <option value="SmileOutlined">😊 Smile</option>
                    <option value="TeamOutlined">👥 Team</option>
                    <option value="CompassOutlined">🧭 Compass</option>
                    <option value="CarOutlined">🚗 Car</option>
                    <option value="CoffeeOutlined">☕ Coffee</option>
                    <option value="HeartOutlined">❤️ Heart</option>
                    <option value="CloudOutlined">☁️ Cloud</option>
                    <option value="ShoppingOutlined">🛍️ Shopping</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-text-primary mb-1">เป้าหมายสนทนา (Goal) *</label>
                <input
                  type="text"
                  required
                  value={editingLesson.goal || ''}
                  onChange={(e) => setEditingLesson((prev) => ({ ...prev, goal: e.target.value }))}
                  placeholder="เช่น สั่งลาเต้ร้อนไม่หวาน และชำระเงินสำเร็จ"
                  className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">คำอธิบายภาษาไทย *</label>
                  <textarea
                    rows={2}
                    required
                    value={editingLesson.descriptionTh || ''}
                    onChange={(e) => setEditingLesson((prev) => ({ ...prev, descriptionTh: e.target.value }))}
                    placeholder="คำอธิบายสั้นๆ เกี่ยวกับบทเรียนนี้ สำหรับผู้เรียนคนไทย..."
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-primary mb-1">คำอธิบายภาษาอังกฤษ *</label>
                  <textarea
                    rows={2}
                    required
                    value={editingLesson.descriptionEn || ''}
                    onChange={(e) => setEditingLesson((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                    placeholder="Short description for English speakers..."
                    className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              {/* Lesson Type Selection */}
              <div className="p-4 rounded-xl border-2 border-border-color bg-accent-yellow/15 flex flex-col gap-2 mt-1">
                <label className="block text-xs font-black text-text-primary">ลักษณะการทำบทเรียน (Lesson Type) *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-text-primary cursor-pointer">
                    <input
                      type="radio"
                      name="lesson-type"
                      value="ai"
                      checked={editingLesson.type === 'ai'}
                      onChange={() => setEditingLesson((prev) => ({ ...prev, type: 'ai' }))}
                      className="cursor-pointer h-4 w-4"
                    />
                    <span>🤖 แบบที่ 1: พูดคุยแบบอิสระโดยใช้ AI</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-text-primary cursor-pointer">
                    <input
                      type="radio"
                      name="lesson-type"
                      value="choice"
                      checked={editingLesson.type === 'choice'}
                      onChange={() => setEditingLesson((prev) => ({ ...prev, type: 'choice' }))}
                      className="cursor-pointer h-4 w-4"
                    />
                    <span>💡 แบบที่ 2: คุยแบบตอบตัวเลือก (Multiple-Choice)</span>
                  </label>
                </div>
              </div>

              {/* Conditional Fields: AI Mode */}
              {editingLesson.type === 'ai' && (
                <div className="flex flex-col gap-4 border-t-2 border-dashed border-border-color pt-4">
                  <div>
                    <label className="block text-xs font-black text-text-primary mb-1">Prompt ระบบสำหรับ AI (System Context) *</label>
                    <textarea
                      rows={3}
                      required
                      value={editingLesson.systemContext || ''}
                      onChange={(e) => setEditingLesson((prev) => ({ ...prev, systemContext: e.target.value }))}
                      placeholder="เช่น This is a beginner lesson. Act as a barista in a Korean coffee shop. Guide the user to order a hot latte without sugar..."
                      className="w-full rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-text-primary mb-1">คำศัพท์แนะนำหลักในบทเรียน (Vocabulary Context)</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                        placeholder="เช่น 아메리카노 (อเมริกาโน่)"
                        className="flex-1 rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
                      />
                      <button
                        type="button"
                        onClick={handleAddWord}
                        className="px-4 rounded-xl border-3 border-border-color bg-accent-blue text-white font-bold text-xs shadow-nb-sm active:translate-y-[1px] cursor-pointer"
                      >
                        เพิ่มคำศัพท์
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(editingLesson.wordContext || []).length === 0 ? (
                        <span className="text-xs text-text-secondary/60">ยังไม่มีคำศัพท์คีย์เวิร์ด</span>
                      ) : (
                        (editingLesson.wordContext || []).map((word, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border border-border-color bg-gray-50 dark:bg-gray-800 text-text-primary shadow-nb-sm"
                          >
                            <span>{word}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveWord(word)}
                              className="text-red-500 hover:text-red-700 font-extrabold ml-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Fields: Choice (Scripted) Mode */}
              {editingLesson.type === 'choice' && (
                <div className="flex flex-col gap-6 border-t-2 border-dashed border-border-color pt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-text-primary">ตัวแก้ไขขั้นตอนสนทนา (Script Steps Editor)</label>
                    <span className="text-[10px] font-bold text-text-secondary">{lessonScriptSteps.length} ขั้นตอน</span>
                  </div>

                  <div className="flex flex-col gap-5">
                    {lessonScriptSteps.map((step, index) => (
                      <div
                        key={step.id || index}
                        className="rounded-xl border-2 border-border-color bg-gray-50 dark:bg-gray-800/40 p-4 relative flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between border-b border-border-color pb-2">
                          <span className="rounded-lg border border-border-color bg-accent-yellow px-2 py-0.5 text-[10px] font-black text-black">
                            ขั้นตอนที่ {index + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveFormStepUp(index)}
                              disabled={index === 0}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-border-color bg-white dark:bg-[#3d2d44] disabled:opacity-40 text-text-primary shadow-nb-sm cursor-pointer"
                            >
                              <ArrowUpOutlined style={{ fontSize: 10 }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFormStepDown(index)}
                              disabled={index === lessonScriptSteps.length - 1}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-border-color bg-white dark:bg-[#3d2d44] disabled:opacity-40 text-text-primary shadow-nb-sm cursor-pointer"
                            >
                              <ArrowDownOutlined style={{ fontSize: 10 }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteFormStep(index)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-border-color bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 shadow-nb-sm cursor-pointer"
                            >
                              <DeleteOutlined style={{ fontSize: 10 }} />
                            </button>
                          </div>
                        </div>

                        {/* Bot fields */}
                        <div className="flex flex-col gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary mb-0.5">🇰🇷 ประโยคเกาหลี (ของบอท / คู่สนทนา) *</label>
                            <input
                              type="text"
                              required
                              value={step.partnerMessage || ''}
                              onChange={(e) => updateFormStepField(index, 'partnerMessage', e.target.value)}
                              placeholder="เช่น 어서 오세요! 무엇을 드릴까요?"
                              className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-text-secondary mb-0.5">🗣️ คำอ่านภาษาไทย *</label>
                              <input
                                type="text"
                                required
                                value={step.partnerReading || ''}
                                onChange={(e) => updateFormStepField(index, 'partnerReading', e.target.value)}
                                placeholder="เช่น ออ-ซอ โอ-เซ-โย! มู-ออ-ซึล ทือ-ริล-กา-โย?"
                                className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-text-secondary mb-0.5">🇹🇭 คำแปลภาษาไทย *</label>
                              <input
                                type="text"
                                required
                                value={step.partnerTranslation || ''}
                                onChange={(e) => updateFormStepField(index, 'partnerTranslation', e.target.value)}
                                placeholder="เช่น ยินดีต้อนรับครับ! รับอะไรดีครับ?"
                                className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary mb-0.5">🔤 คำอ่านภาษาอังกฤษ (Romanization - ไม่บังคับ)</label>
                            <input
                              type="text"
                              value={step.partnerRomanization || ''}
                              onChange={(e) => updateFormStepField(index, 'partnerRomanization', e.target.value)}
                              placeholder="เช่น Eoseo oseyo! Mueoseul deurilkkayo?"
                              className="w-full rounded-lg border border-border-color bg-white dark:bg-[#1a1a2e] px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                            />
                          </div>
                        </div>

                        {/* Suggestions */}
                        <div className="flex flex-col gap-2 mt-1.5 border-t border-dashed border-border-color pt-2">
                          <label className="block text-[10px] font-black text-text-primary">💡 ตัวเลือกคำตอบสำหรับการป้อนข้อความ (Suggestions) *</label>
                          <div className="flex flex-col gap-2">
                            {step.suggestions.map((sug, sugIdx) => (
                              <div key={sugIdx} className="flex gap-2 items-center p-2.5 bg-white dark:bg-[#1a1a2e] border border-border-color rounded-lg relative">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <input
                                      type="text"
                                      required
                                      value={sug.korean || ''}
                                      onChange={(e) => updateFormSuggestion(index, sugIdx, 'korean', e.target.value)}
                                      placeholder="เกาหลี: เช่น 아메리카노 주세요."
                                      className="w-full border-b border-border-color px-1 py-0.5 text-xs text-text-primary outline-none focus:border-accent-blue bg-transparent"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      required
                                      value={sug.translation || ''}
                                      onChange={(e) => updateFormSuggestion(index, sugIdx, 'translation', e.target.value)}
                                      placeholder="แปลไทย: เช่น ขออเมริกาโน่ครับ"
                                      className="w-full border-b border-border-color px-1 py-0.5 text-xs text-text-primary outline-none focus:border-accent-blue bg-transparent"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteFormSuggestion(index, sugIdx)}
                                  disabled={step.suggestions.length <= 1}
                                  className="h-6 w-6 flex items-center justify-center text-red-500 hover:text-red-700 disabled:opacity-40 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => addFormSuggestion(index)}
                            className="self-start flex items-center gap-1 px-2 py-1 rounded-lg border border-border-color bg-gray-50 dark:bg-gray-800 text-text-primary font-bold text-[9px] cursor-pointer shadow-nb-sm"
                          >
                            <PlusOutlined style={{ fontSize: 7 }} />
                            <span>เพิ่มตัวเลือก</span>
                          </button>
                        </div>

                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addFormStep}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-border-color hover:border-black bg-white dark:bg-[#1a1a2e] text-text-primary font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-nb-sm active:translate-y-[1px]"
                    >
                      <PlusOutlined />
                      <span>เพิ่มขั้นตอนสคริปต์ใหม่ (Add Step)</span>
                    </button>
                  </div>
                </div>
              )}

            </form>

            {/* Footer */}
            <div className="flex gap-3 border-t-2 border-border-color pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-2.5 rounded-xl border-3 border-border-color bg-white dark:bg-[#1a1a2e] text-text-primary text-sm font-bold shadow-nb-sm active:translate-y-[1px] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitForm}
                className="flex-1 py-2.5 rounded-xl border-3 border-border-color bg-accent-green text-white text-sm font-black shadow-nb-sm active:translate-y-[1px] cursor-pointer"
              >
                {formMode === 'create' ? 'สร้างบทเรียน' : 'บันทึกการแก้ไข'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
